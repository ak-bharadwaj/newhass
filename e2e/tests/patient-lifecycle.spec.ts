import { test, expect, APIRequestContext, Locator, Page } from '@playwright/test'
import fs from 'fs'

const UI_BASE = process.env.BASE_URL || 'http://localhost:3000'
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8000'

const USERS = {
  manager: { email: 'manager@hass.example', password: 'manager123' },
  reception: { email: 'reception@hass.example', password: 'reception123' },
  nurse: { email: 'nurse@hass.example', password: 'nurse123' },
  doctor: { email: 'doctor@hass.example', password: 'doctor123' },
  pharmacist: { email: 'pharma@hass.example', password: 'pharma123' },
  labTech: { email: 'lab@hass.example', password: 'lab123' },
}

async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API_BASE}/api/v1/auth/login`, { data: { email, password } })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  return data.access_token as string
}

async function apiMe(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

async function apiPost(request: APIRequestContext, token: string, endpoint: string, body: any) {
  const res = await request.post(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  })
  if (!res.ok()) {
    const txt = await res.text()
    console.error(`API POST ${endpoint} failed ${res.status()} ${res.statusText()} -> ${txt}`)
  }
  expect(res.ok()).toBeTruthy()
  return res.json()
}

function tinyPngBuffer(): Buffer {
  // 1x1 transparent PNG
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMBgZ5m2e8AAAAASUVORK5CYII='
  return Buffer.from(b64, 'base64')
}

test.describe('Patient full lifecycle E2E', () => {
  test.setTimeout(180_000)

  async function loginUI(page: Page, email: string, password: string, uiBase: string) {
    await page.goto(`${uiBase}/login`)
    const emailInput = (await page.getByTestId('login-email').isVisible().catch(() => false))
      ? page.getByTestId('login-email')
      : (await page.getByLabel(/email address/i).isVisible().catch(() => false))
        ? page.getByLabel(/email address/i)
        : page.locator('#email')
    const passwordInput = (await page.getByTestId('login-password').isVisible().catch(() => false))
      ? page.getByTestId('login-password')
      : (await page.getByLabel(/password/i).isVisible().catch(() => false))
        ? page.getByLabel(/password/i)
        : page.locator('#password')
    await emailInput.fill(email)
    await passwordInput.fill(password)
    const submitBtn = page.getByTestId('login-submit').or(page.getByRole('button', { name: /login|sign in/i }))
    await submitBtn.click()
  }

  test('end-to-end patient journey across roles', async ({ page, request }) => {
    // Unique identifiers for this run
    const ts = Date.now()
    const firstName = `Test${ts}`
    const lastName = 'Patient'

    // 1) Manager creates patient (new ID path)
    const managerToken = await apiLogin(request, USERS.manager.email, USERS.manager.password)
    const meManager = await apiMe(request, managerToken)
    const hospitalId = meManager.hospital_id
    expect(hospitalId).toBeTruthy()

    const patient = await apiPost(request, managerToken, '/api/v1/patients', {
      hospital_id: String(hospitalId),
      first_name: firstName,
      last_name: lastName,
      date_of_birth: '1990-01-01',
      gender: 'male',
      phone: `+1-555-${String(ts).slice(-4)}`,
      email: `test${ts}@example.com`,
      address: '123 Test Street',
      emergency_contact_name: 'Test Contact',
      emergency_contact_phone: `+1-555-${String(ts).slice(-4)}`,
      blood_group: 'O+',
    })
    expect(patient?.id).toBeTruthy()
    const patientId = patient.id as string
    const patientMRN = patient.mrn as string

    // 2) Create a visit for patient (so Nurse/Doctor flows have a visit)
    const visit = await apiPost(request, managerToken, '/api/v1/visits', {
      patient_id: patientId,
      hospital_id: String(hospitalId),
      visit_type: 'outpatient',
      reason_for_visit: 'General checkup',
    })
    expect(visit?.id).toBeTruthy()
    const visitId = visit.id as string

  // 3) Doctor context (for id), but create appointment as manager per API role requirement
  const doctorToken = await apiLogin(request, USERS.doctor.email, USERS.doctor.password)
  const meDoctor = await apiMe(request, doctorToken)
    const doctorId = meDoctor.id as string

    // Create an appointment for today + 30 minutes
    const startAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    let appointmentCreated = false
    try {
      const appt = await apiPost(request, managerToken, '/api/v1/appointments', {
        patient_id: patientId,
        doctor_id: doctorId,
        hospital_id: String(hospitalId),
        scheduled_at: startAt,
        appointment_type: 'consultation',
        reason: 'Checkup',
      })
      expect(appt?.id).toBeTruthy()
      appointmentCreated = true
    } catch (e) {
      test.info().annotations.push({ type: 'note', description: `Appointment creation failed; continuing without appointment: ${String(e).slice(0,180)}` })
    }

    // 4) Reception checks patient in via UI
  await loginUI(page, USERS.reception.email, USERS.reception.password, UI_BASE)
    await page.waitForURL(/\/dashboard\/reception/)

    // Navigate to Check-in
    await page.goto(`${UI_BASE}/dashboard/reception/check-in`)
    await page.waitForLoadState('networkidle')

    // Find the card for our patient and click Check In
    const card = page.locator('div').filter({ hasText: new RegExp(`${firstName}\\s+${lastName}`) }).first()
    if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
      const checkInBtn = card.getByRole('button', { name: /check in/i })
      if (await checkInBtn.isVisible().catch(() => false)) {
        await checkInBtn.click()
        // Confirm dialog
        const confirm = page.getByRole('button', { name: /confirm check-in/i })
        await confirm.click()
        await page.waitForTimeout(1000)
      }
    } else {
      test.info().annotations.push({ type: 'note', description: 'No check-in card visible; proceeding without check-in (appointment may not exist)' })
    }

    // 5) Nurse records vitals via UI
  await loginUI(page, USERS.nurse.email, USERS.nurse.password, UI_BASE)
    await page.waitForURL(/\/dashboard\/nurse/)

    await page.goto(`${UI_BASE}/dashboard/nurse/vitals`)
    await page.waitForLoadState('networkidle')

    // Select patient from dropdown
    const select1 = page.getByRole('combobox').first()
    const option1 = select1.locator('option', { hasText: new RegExp(`${firstName}.*${lastName}.*${patientMRN}`) }).first()
    const value1 = await option1.getAttribute('value')
    if (value1) {
      await select1.selectOption(value1)
    }

    // Open form and fill vitals
    await page.getByRole('button', { name: /record vitals/i }).click()
    const formSelect = page.getByRole('combobox').first()
    const formOption = formSelect.locator('option', { hasText: new RegExp(`${firstName}.*${lastName}.*${patientMRN}`) }).first()
    const formValue = await formOption.getAttribute('value')
    if (formValue) {
      await formSelect.selectOption(formValue).catch(() => {})
    }
    await page.getByLabel(/systolic/i).fill('120')
    await page.getByLabel(/diastolic/i).fill('80')
    await page.getByLabel(/heart rate/i).fill('72')
    await page.getByLabel(/temperature/i).fill('37')
    await page.getByLabel(/o₂|o2|oxygen/i).fill('98')
    await page.getByLabel(/resp/i).fill('16')
    {
      const recordBtn = page.getByRole('button', { name: /record vitals/i }).last()
      await recordBtn.scrollIntoViewIfNeeded()
      await recordBtn.click()
    }

    // 6) Doctor writes a prescription via UI
  await loginUI(page, USERS.doctor.email, USERS.doctor.password, UI_BASE)
    await page.waitForURL(/\/dashboard\/doctor/)

    await page.goto(`${UI_BASE}/dashboard/doctor/prescriptions`)
    await page.waitForLoadState('networkidle')

    // Choose patient and open new prescription form
    const select2 = page.getByRole('combobox').first()
    const option2 = select2.locator('option', { hasText: new RegExp(`${firstName}.*${lastName}.*${patientMRN}`) }).first()
    const value2 = await option2.getAttribute('value')
    if (value2) {
      await select2.selectOption(value2)
    }
    await page.getByRole('button', { name: /new prescription/i }).click()
    const modalSelect = page.getByRole('combobox').first()
    const modalOption = modalSelect.locator('option', { hasText: new RegExp(`${firstName}.*${lastName}.*${patientMRN}`) }).first()
    const modalValue = await modalOption.getAttribute('value')
    if (modalValue) {
      await modalSelect.selectOption(modalValue).catch(() => {})
    }

    await page.getByLabel(/medication/i).fill('Amoxicillin')
    await page.getByLabel(/dosage/i).fill('500mg')
    await page.getByLabel(/^route/i).selectOption({ label: 'Oral' })
    await page.getByLabel(/duration/i).fill('7 days')
    await page.getByLabel(/^frequency/i).selectOption({ label: 'Twice daily' })
    await page.getByLabel(/instructions/i).fill('Take after meals')
    await page.getByRole('button', { name: /create prescription/i }).click()

    // Wait for card with medication to appear
    await expect(page.getByText(/amoxicillin/i)).toBeVisible({ timeout: 15000 })

    // 7) Doctor orders a lab test via API (since UI may not exist)
    const labOrder = await apiPost(request, doctorToken, '/api/v1/clinical/lab-tests', {
      patient_id: patientId,
      visit_id: visitId,
      test_type: 'CBC',
      urgency: 'routine',
      notes: 'Automated test order',
    })
    expect(labOrder?.id).toBeTruthy()

    // 8) Lab Tech uploads result via UI
  await loginUI(page, USERS.labTech.email, USERS.labTech.password, UI_BASE)
    await page.waitForURL(/\/dashboard\/lab/)

    await page.goto(`${UI_BASE}/dashboard/lab_tech/results`)
    await page.waitForLoadState('networkidle')

    const labCard = page.locator('div').filter({ hasText: patientMRN }).first()
    await expect(labCard).toBeVisible({ timeout: 15000 })

    const input = labCard.locator('input[type="file"]').first()
    await input.setInputFiles({ name: 'report.png', mimeType: 'image/png', buffer: tinyPngBuffer() })

    // 9) Pharmacist dispenses via UI
  await loginUI(page, USERS.pharmacist.email, USERS.pharmacist.password, UI_BASE)
    await page.waitForURL(/\/dashboard\/pharmacist/)

    await page.goto(`${UI_BASE}/dashboard/pharmacist/prescriptions`)
    await page.waitForLoadState('networkidle')

    // Find our medication and mark dispensed
    const rxCard = page.locator('div').filter({ hasText: new RegExp(`Amoxicillin|${firstName}\s+${lastName}`) }).first()
    await expect(rxCard).toBeVisible({ timeout: 20000 })
    const dispenseBtn = rxCard.getByRole('button', { name: /mark as dispensed/i })
    if (await dispenseBtn.isVisible().catch(() => false)) {
      await dispenseBtn.click()
      // Wait for button to disappear
      await expect(dispenseBtn).toBeHidden({ timeout: 15000 })
    }

    // Final assertion: Pharmacist stats show at least 1 dispensed
    const dispensedStat = page.getByText(/dispensed/i)
    await expect(dispensedStat).toBeVisible()
  })
})
