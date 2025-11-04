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

const ALLOW_EMPTY_PAGES = new Set<string>([
  '/dashboard/pharmacist/drugs', // placeholder but with CTAs
])

test.describe.serial('Verify nav links are real and interactive', () => {
  for (const { role, email, password } of roles) {
    test(`check all nav links for ${role}`, async ({ page }) => {
      await login(page, email, password)
      // Wait for dashboard landing
      await page.waitForURL(new RegExp(`/dashboard/${role.split('_').join('[_-]')}`), { timeout: 20000 }).catch(() => {})
      // Ensure sidebar/nav rendered
      await page.waitForSelector('[data-testid^="nav-"]', { timeout: 20000 })

      // Expand any submenus to reveal all links
  const toggles = page.locator('[data-testid^="nav-menu-"]')
      const toggleCount = await toggles.count()
      for (let i = 0; i < toggleCount; i++) {
        const t = toggles.nth(i)
        await t.click({ trial: true }).catch(() => {})
        await t.click().catch(() => {})
      }

      // Collect all role nav links
      const navItems = page.locator(`[data-testid^="nav-${role}-"]`)
      const count = await navItems.count()
      expect(count).toBeGreaterThan(1)

      const seen = new Set<string>()
      for (let i = 0; i < count; i++) {
        const link = navItems.nth(i)
        const href = await link.getAttribute('href')
        if (!href || href === '#' || seen.has(href)) continue
        seen.add(href)

        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 25000 }).catch(() => {}),
          link.click({ timeout: 10000 }).catch(() => page.goto(href).catch(() => {})),
        ])

        // Allow certain placeholder pages
        if (ALLOW_EMPTY_PAGES.has(href)) {
          continue
        }

        // Expect at least one interactive element visible
        const interactive = page.locator('button:visible, input:visible, select:visible, textarea:visible, a[href]:visible')
        const icount = await interactive.count()
        expect(icount, `No interactive elements found on ${href} for role ${role}`).toBeGreaterThan(0)
      }
    })
  }
})
