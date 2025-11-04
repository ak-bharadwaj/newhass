#!/usr/bin/env node
/*
  Run a backend-only patient lifecycle using HTTP fetch. No browser required.
  Requires backend on http://localhost:8000 and seeded users.
*/

const API = process.env.API_BASE_URL || 'http://localhost:8000'

async function jsonFetch(path, { method = 'GET', token, data, headers = {} } = {}) {
  const maxAttempts = 3
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const h = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }
      if (!(data instanceof FormData)) h['Content-Type'] = 'application/json'
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`${API}${path}`, {
        method,
        headers: h,
        body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`${method} ${path} => ${res.status} ${res.statusText} ${txt}`)
      }
      const ct = res.headers.get('content-type') || ''
      return ct.includes('application/json') ? res.json() : res.text()
    } catch (err) {
      lastErr = err
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 500 * attempt))
        continue
      }
      throw err
    }
  }
  throw lastErr || new Error('Unknown error')
}

async function login(email, password) {
  const res = await jsonFetch('/api/v1/auth/login', { method: 'POST', data: { email, password } })
  return res.access_token
}

async function main() {
  const ts = Date.now()
  const first = `E2E${ts}`
  const last = 'Lifecycle'
  const email = `e2e_${ts}@example.com`

  const users = {
    manager: { email: 'manager@hass.example', password: 'manager123' },
    doctor: { email: 'doctor@hass.example', password: 'doctor123' },
    nurse: { email: 'nurse@hass.example', password: 'nurse123' },
    lab: { email: 'lab@hass.example', password: 'lab123' },
  }

  console.log('🔐 Logging in roles...')
  const managerToken = await login(users.manager.email, users.manager.password)
  const doctorToken = await login(users.doctor.email, users.doctor.password)
  const nurseToken = await login(users.nurse.email, users.nurse.password)
  const labToken = await login(users.lab.email, users.lab.password)

  const meMgr = await jsonFetch('/api/v1/auth/me', { token: managerToken })
  if (!meMgr.hospital_id) throw new Error('Manager has no hospital_id')
  const hospitalId = meMgr.hospital_id
  console.log('🏥 Hospital:', hospitalId)
  const meDoctor = await jsonFetch('/api/v1/auth/me', { token: doctorToken })
  const doctorId = meDoctor?.id

  console.log('👤 Creating patient...')
  const patient = await jsonFetch('/api/v1/patients', {
    method: 'POST',
    token: managerToken,
    data: {
      hospital_id: hospitalId,
      first_name: first,
      last_name: last,
      date_of_birth: '1990-01-01',
      gender: 'male',
      phone: '+1-555-0000',
      email,
      address: '123 Test St',
    },
  })
  console.log('   → patient', patient.id, patient.mrn)

  console.log('📋 Creating OP visit...')
  const visit = await jsonFetch('/api/v1/visits', {
    method: 'POST',
    token: managerToken,
    data: { patient_id: patient.id, hospital_id: hospitalId, attending_doctor_id: doctorId, visit_type: 'outpatient', reason_for_visit: 'Checkup' },
  })
  console.log('   → visit', visit.id)

  console.log('💓 Recording vitals (normal)...')
  await jsonFetch('/api/v1/clinical/vitals', {
    method: 'POST', token: nurseToken,
    data: { patient_id: patient.id, visit_id: visit.id, blood_pressure_systolic: 120, blood_pressure_diastolic: 80, heart_rate: 72, temperature: 37, spo2: 98, respiratory_rate: 16 },
  })
  console.log('   → vitals ok')

  console.log('📝 Creating prescription...')
  const rx = await jsonFetch('/api/v1/clinical/prescriptions', {
    method: 'POST', token: doctorToken,
    data: { patient_id: patient.id, visit_id: visit.id, medication_name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', route: 'Oral', duration_days: 7, start_date: new Date().toISOString().split('T')[0], instructions: 'Take after meals' },
  })
  console.log('   → prescription', rx.id)

  console.log('🧪 Ordering lab test...')
  const lab = await jsonFetch('/api/v1/clinical/lab-tests', {
    method: 'POST', token: doctorToken,
    data: { patient_id: patient.id, visit_id: visit.id, test_type: 'CBC', urgency: 'routine', notes: 'Routine check' },
  })
  console.log('   → lab test', lab.id)

  console.log('🧪 Accepting lab test...')
  await jsonFetch(`/api/v1/clinical/lab-tests/${lab.id}/status`, { method: 'PATCH', token: labToken, data: { status: 'in_progress' } })
  console.log('   → accepted by lab tech')

  console.log('📄 Uploading lab results (text)...')
  await jsonFetch(`/api/v1/clinical/lab-tests/${lab.id}/results`, { method: 'POST', token: labToken, data: { results: 'CBC normal. WBC 6.5, RBC 4.8, Hb 14.0 g/dL, Platelets 250k.', notes: 'Auto-uploaded by E2E lifecycle' } })
  console.log('   → lab results uploaded, test completed')

  console.log('🛏️ Ensuring an available bed...')
  const beds = await jsonFetch(`/api/v1/beds?hospital_id=${hospitalId}`, { token: managerToken })
  let bed = beds.find(b => b.status === 'available')
  if (!bed) {
    bed = await jsonFetch('/api/v1/beds', { method: 'POST', token: managerToken, data: { hospital_id: hospitalId, bed_number: `E-${String(ts).slice(-4)}`, ward: 'General', bed_type: 'standard' } })
  }
  await jsonFetch(`/api/v1/beds/${bed.id}/assign`, { method: 'POST', token: managerToken, data: { patient_id: patient.id, visit_id: visit.id } })
  await jsonFetch(`/api/v1/beds/${bed.id}/release`, { method: 'POST', token: managerToken })
  console.log('   → bed assign/release ok')

  console.log('\n✅ Backend lifecycle PASS')
}

main().catch(err => {
  console.error('\n❌ Backend lifecycle FAIL:', err.message)
  process.exit(1)
})
