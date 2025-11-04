$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8000'

$loginBody = @{ email = 'patient@hass.example'; password = 'patient123' }
$resp = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method Post -Body ($loginBody | ConvertTo-Json) -ContentType 'application/json'
$token = $resp.access_token
Write-Host ("Token len: {0}" -f $token.Length)

Write-Host "Calling /api/v1/patients/me"
$me = Invoke-RestMethod -Uri "$base/api/v1/patients/me" -Headers @{ Authorization = "Bearer $token" } -Method Get
$me | ConvertTo-Json -Depth 5
