$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8000'

# Login
$loginBody = @{ email = 'admin@hass.example'; password = 'admin123' }
$resp = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method Post -Body ($loginBody | ConvertTo-Json) -ContentType 'application/json'
$token = $resp.access_token
Write-Host ("Token len: {0}" -f $token.Length)

# /auth/me
$me = Invoke-RestMethod -Uri "$base/api/v1/auth/me" -Headers @{ Authorization = "Bearer $token" }
Write-Host ("ME role: {0}" -f $me.role_name)

# API Keys list
$keys = Invoke-RestMethod -Uri "$base/api/v1/admin/api-keys" -Headers @{ Authorization = "Bearer $token" }
if ($keys.api_keys) {
  $count = ($keys.api_keys | Measure-Object).Count
} else {
  $count = 0
}
Write-Host ("API keys count: {0}" -f $count)

# Patients list
$patients = Invoke-RestMethod -Uri "$base/api/v1/patients" -Headers @{ Authorization = "Bearer $token" }
Write-Host ("Patients total: {0}" -f $patients.total)
