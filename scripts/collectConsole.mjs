import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5175/'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.on('console', (msg) => console.log('BROWSER:', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    console.log('Loaded', url)
  } catch (e) {
    console.log('Navigation error:', e.message)
  }
  await browser.close()
})()
