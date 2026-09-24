import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5175'
const browser = await chromium.launch({ headless: true })

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 375, height: 812 }
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
    await page.goto(baseUrl, { waitUntil: 'networkidle' })

    const title = await page.locator('h1').textContent()
    const cards = await page.locator('.restaurant-card').count()
    const bookingPanelVisible = await page.locator('.booking-panel').isVisible()
    if (!title?.includes('Вечер') || cards !== 3 || !bookingPanelVisible) {
      throw new Error(`${viewport.name}: базовые компоненты не отобразились корректно`)
    }

    if (viewport.name === 'mobile') {
      const display = await page.locator('.content-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns)
      if (display.split(' ').length !== 1) throw new Error('mobile: панели не перешли в одну колонку')
    }

    console.log(`${viewport.name}: ${cards} карточки, форма видна`)
    await page.close()
  }
} finally {
  await browser.close()
}
