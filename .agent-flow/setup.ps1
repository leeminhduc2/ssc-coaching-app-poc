$ErrorActionPreference = "Stop"

$Project = (Get-Location).Path

Write-Host "Creating orchestration workspace..."

$created = (
    herdr workspace create `
        --cwd "$Project" `
        --label "AI Orchestrator" `
        --no-focus
) | ConvertFrom-Json

$WorkspaceId = $created.result.workspace.workspace_id
$PlannerPane = $created.result.root_pane.pane_id


# Planner | Tester
$split = (
    herdr pane split $PlannerPane `
        --direction right `
        --ratio 0.50 `
        --no-focus
) | ConvertFrom-Json

$TesterPane = $split.result.pane.pane_id


# Reviewer below Planner
$split = (
    herdr pane split $PlannerPane `
        --direction down `
        --ratio 0.50 `
        --no-focus
) | ConvertFrom-Json

$ReviewerPane = $split.result.pane.pane_id


# Logs below Tester
$split = (
    herdr pane split $TesterPane `
        --direction down `
        --ratio 0.50 `
        --no-focus
) | ConvertFrom-Json

$LogsPane = $split.result.pane.pane_id


herdr pane rename $PlannerPane  "Planner"
herdr pane rename $TesterPane   "Tester"
herdr pane rename $ReviewerPane "Final Reviewer"
herdr pane rename $LogsPane     "Orchestrator Logs"

Write-Host ""
Write-Host "Workspace: $WorkspaceId"
Write-Host "Planner:   $PlannerPane"
Write-Host "Tester:    $TesterPane"
Write-Host "Reviewer:  $ReviewerPane"
Write-Host "Logs:      $LogsPane"