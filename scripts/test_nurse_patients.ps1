$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8000'

$loginBody = @{ email = 'nurse@hass.example'; password = 'nurse123' }
$resp = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method Post -Body ($loginBody | ConvertTo-Json) -ContentType 'application/json'
$token = $resp.access_token
Write-Host ("Token len: {0}" -f $token.Length)

Write-Host "Querying /api/v1/patients/nurse-patients"
$patients = Invoke-RestMethod -Uri "$base/api/v1/patients/nurse-patients" -Headers @{ Authorization = "Bearer $token" } -Method Get
$count = @($patients).Count
Write-Host ("Nurse patients returned: {0}" -f $count)
$patients | ConvertTo-Json -Depth 5
