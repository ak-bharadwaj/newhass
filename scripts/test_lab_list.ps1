$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8000'

$loginBody = @{ email = 'lab@hass.example'; password = 'lab123' }
$resp = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method Post -Body ($loginBody | ConvertTo-Json) -ContentType 'application/json'
$token = $resp.access_token
Write-Host ("Token len: {0}" -f $token.Length)

Write-Host "Querying /api/v1/clinical/lab-tests"
$tests = Invoke-RestMethod -Uri "$base/api/v1/clinical/lab-tests" -Headers @{ Authorization = "Bearer $token" } -Method Get
$count = @($tests).Count
Write-Host ("Lab tests returned: {0}" -f $count)
$tests | ConvertTo-Json -Depth 5
