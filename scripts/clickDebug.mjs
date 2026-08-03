import { chromium } from 'playwright'

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  page.on('console', (m) => console.log('BROWSER:', m.type(), m.text()))
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))
  await page.goto('http://localhost:5175/')
  await page.waitForTimeout(1000)
  const btn = await page.locator('text=Start Practicing')
  console.log('Button visible?', await btn.isVisible())
  await btn.click()
  await page.waitForTimeout(2000)
  console.log('URL after click:', page.url())
  await page.screenshot({ path: 'click-debug.png' })
  console.log('Saved click-debug.png')
  await browser.close()
})()
