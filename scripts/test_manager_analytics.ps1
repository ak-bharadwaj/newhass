$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8000'

$loginBody = @{ email = 'manager@hass.example'; password = 'manager123' }
$resp = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method Post -Body ($loginBody | ConvertTo-Json) -ContentType 'application/json'
$token = $resp.access_token
Write-Host ("Token len: {0}" -f $token.Length)

$hospital = '9be38a3d-3242-476a-8cd6-e1c1116c3862'
Write-Host ("Querying analytics/patients for hospital: {0}" -f $hospital)
$patients = Invoke-RestMethod -Uri "$base/api/v1/analytics/patients?hospital_id=$hospital" -Headers @{ Authorization = "Bearer $token" } -Method Get
$count = @($patients).Count
Write-Host ("Patients returned: {0}" -f $count)
$patients | ConvertTo-Json -Depth 5
