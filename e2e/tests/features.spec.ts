import { test, expect } from '@playwright/test'

test.describe('Key feature pages', () => {
  test('Super Admin can manage API keys', async ({ page }) => {
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
    await emailInput.fill('admin@hass.example')
    await passwordInput.fill('admin123')
    const submitBtn = page.getByTestId('login-submit').or(page.getByRole('button', { name: /sign in/i }))
    await submitBtn.click()

  await expect(page).toHaveURL(/\/dashboard\/super_admin/, { timeout: 15000 })

    // Navigate to API Keys page
  await page.goto('/dashboard/admin/api-keys')
  await expect(page.getByRole('heading', { name: /create api key/i })).toBeVisible({ timeout: 15000 })

    // Create a new API key
  await page.getByPlaceholder('Integration name').fill('E2E Test Key')
    await page.getByRole('button', { name: /create api key/i }).click()
    // Wait for toast or table refresh
    await page.waitForTimeout(500)

  // Expect the new key to appear in the Existing Keys table
  const cells = page.getByRole('cell', { name: 'E2E Test Key' })
  await expect.soft(cells.first()).toBeVisible({ timeout: 10000 })
  })

  test('Pharmacist can view inventory', async ({ page }) => {
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
    await emailInput.fill('pharma@hass.example')
    await passwordInput.fill('pharma123')
    const submitBtn = page.getByTestId('login-submit').or(page.getByRole('button', { name: /sign in/i }))
    await submitBtn.click()

    await expect(page).toHaveURL(/\/dashboard\/pharmacist/)

    await page.goto('/dashboard/pharmacist/inventory')
    await expect(page.getByRole('heading', { name: /pharmacy inventory/i })).toBeVisible()
  })
})
