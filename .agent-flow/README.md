To start a runtime

```powershell
$HerdrState = Get-Content `
    "D:\github_repo\ssc-coaching-app-poc\.agent-flow\state\herdr-layout.json" `
    -Raw |
    ConvertFrom-Json

```