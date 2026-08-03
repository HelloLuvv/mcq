import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5175/'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'screenshot.png', fullPage: true })
  console.log('Screenshot saved to screenshot.png')
  await browser.close()
})()
