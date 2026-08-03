import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5175'

test('home page loads and contains title', async ({ page }) => {
  await page.goto(BASE + '/')
  await page.waitForSelector('h1', { timeout: 15000 })
  await expect(page.locator('h1')).toContainText('Prepare smarter')
})

test('navigate to student portal', async ({ page }) => {
  await page.goto(BASE + '/')
  await page.waitForSelector('text=Start Practicing', { timeout: 15000 })
  await page.click('text=Start Practicing', { timeout: 15000 })
  await expect(page).toHaveURL(/\/student/)
  await page.waitForSelector('text=Practice MCQs and track your growth', { timeout: 15000 })
  await expect(page.locator('text=Practice MCQs and track your growth')).toBeVisible()
})
