param([switch]$SkipDatabase)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
# Select a compatible installed runtime without changing the user's global Node.
$nodeMajor = [int](((& node --version).TrimStart('v')).Split('.')[0])
if ($nodeMajor -lt 22) {
  $nvmRoot = Join-Path $env:LOCALAPPDATA 'Author Software/nvm/installs'
  $runtime = Get-ChildItem -LiteralPath $nvmRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^v(2[2-9]|[3-9][0-9])\.' } | Sort-Object Name -Descending | Select-Object -First 1
  if (!$runtime) { throw 'Cần Node.js >= 22. Hãy chọn bản Node mới rồi chạy lại.' }
  $env:PATH = $runtime.FullName + ';' + $env:PATH
}
node scripts/setup.mjs
if (!$SkipDatabase) {
  $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
  if ($psqlCommand) {
    $pgBin = Split-Path -Parent $psqlCommand.Source
    $pgData = Join-Path $PWD '.local/pgdata'
    New-Item -ItemType Directory -Force '.local' | Out-Null
    if (!(Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))) {
      & (Join-Path $pgBin 'initdb.exe') -D $pgData -U ssc --auth=trust --encoding=UTF8 --locale=C
      if ($LASTEXITCODE -ne 0) { throw 'Không thể khởi tạo PostgreSQL cục bộ.' }
    }
    & (Join-Path $pgBin 'pg_ctl.exe') -D $pgData status *> $null
    if ($LASTEXITCODE -ne 0) {
      & (Join-Path $pgBin 'pg_ctl.exe') -D $pgData -l (Join-Path $PWD '.local/postgres.log') -o '-p 55432 -h 127.0.0.1' start
      if ($LASTEXITCODE -ne 0) { throw 'Không thể khởi động PostgreSQL cục bộ.' }
    }
    $found = & $psqlCommand.Source -h 127.0.0.1 -p 55432 -U ssc -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='ssc'"
    if ($found -ne '1') { & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U ssc ssc }
  } else {
    docker compose -f infra/compose.yaml up -d --wait
    if ($LASTEXITCODE -ne 0) { throw 'Hãy mở Docker Desktop hoặc cấu hình DATABASE_URL và dùng -SkipDatabase.' }
  }
}
if (!(Test-Path 'node_modules/.package-lock.json')) { npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Cài dependency thất bại.' } }
npm.cmd run db:generate
npm.cmd run db:migrate
if ($LASTEXITCODE -ne 0) { throw 'Migration thất bại. Kiểm tra DATABASE_URL trong .env.' }
npm.cmd run db:seed
if ($LASTEXITCODE -ne 0) { throw 'Seed thất bại.' }
npm.cmd run dev
