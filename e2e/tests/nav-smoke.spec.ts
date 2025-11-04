import { test, expect, Page } from '@playwright/test'

const roles = [
  { role: 'doctor', email: 'doctor@hass.example', password: 'doctor123' },
  { role: 'nurse', email: 'nurse@hass.example', password: 'nurse123' },
  { role: 'manager', email: 'manager@hass.example', password: 'manager123' },
  { role: 'lab_tech', email: 'lab@hass.example', password: 'lab123' },
  { role: 'pharmacist', email: 'pharma@hass.example', password: 'pharma123' },
  { role: 'regional_admin', email: 'radmin@hass.example', password: 'radmin123' },
  { role: 'super_admin', email: 'admin@hass.example', password: 'admin123' },
  { role: 'reception', email: 'reception@hass.example', password: 'reception123' },
  { role: 'patient', email: 'patient@hass.example', password: 'patient123' },
]

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
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
  const hasSubmitTestId = await page.getByTestId('login-submit').isVisible().catch(() => false)
  if (hasSubmitTestId) {
    await page.getByTestId('login-submit').click()
  } else {
    const fallbackBtn = page.getByRole('button', { name: /sign in|login/i })
    await fallbackBtn.first().click()
  }
}

test.describe.serial('Navigation interactive elements by role', () => {
  for (const { role, email, password } of roles) {
    test(`nav elements rendered for ${role}`, async ({ page }) => {
      await login(page, email, password)
      await page.waitForURL(new RegExp(`/dashboard/${role.split('_').join('[_-]')}`), { timeout: 20000 }).catch(() => {})
      await page.waitForSelector('[data-testid^="nav-"]', { timeout: 20000 })

      // Collect visible nav items for this role
      const navItems = page.locator(`[data-testid^="nav-${role}-"]`).filter({ hasNotText: 'menu' })
      const count = await navItems.count()

      // We expect at least the base Dashboard link plus one more
      expect(count).toBeGreaterThan(1)
    })
  }
})
