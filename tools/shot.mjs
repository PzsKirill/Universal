// Screenshots of a running site, section by section, in the system Edge browser.
// Usage: node tools/shot.mjs <url> [outDir] [--mobile | --wide] [--only=hero]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const url = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const outDir = args.find((a) => !a.startsWith('http') && !a.startsWith('--')) ?? 'screenshots'
const mobile = args.includes('--mobile')
const wide = args.includes('--wide')

const viewport = mobile ? { width: 390, height: 844 } : wide ? { width: 1920, height: 1080 } : { width: 1440, height: 900 }
const prefix = mobile ? 'm' : wide ? 'w' : 'd'

// [name, selector to scroll to (null = top), extra offset in viewport heights, wait ms]
const stops = [
  ['01-hero', null, 0, 6000],
  ['02-trust', '.trust', -0.4, 900],
  ['03-problem', '#why', 0, 1200],
  ['03b-chart', '.lifespan', -0.15, 2200],
  ['03c-deep', '#deep-time', 0, 1400],
  ['03d-deep-mid', '#deep-time', 1.6, 1800],
  ['03e-deep-end', '#deep-time', 2.55, 1800],
  ['04-how', '#how', 0, 1200],
  ['04b-how-encode', '[data-how-track]', 0.2, 1800],
  ['04c-how-etch', '[data-how-track]', 1.3, 2600],
  ['04d-how-seal', '[data-how-track]', 1.9, 2000],
  ['04e-how-retrieve', '[data-how-track]', 2.7, 2600],
  ['05-who', '#who', 0.1, 1600],
  ['06-vault', '#vault', 0, 1400],
  ['06b-vault-details', '.vault__details', -0.05, 1800],
  ['07-mile', '#expedition', 0, 2600],
  ['07b-route', '[data-route]', -0.25, 2000],
  ['07c-kit', '.kit', 0, 1400],
  ['07d-case', '#case', 0.1, 1600],
  ['07e-case-quote', '.case__quote', -0.2, 1800],
  ['08-pricing', '#pricing', 0.05, 1400],
  ['09-faq', '#faq', 0, 2600],
  ['10-finale', '#message', 0, 7500],
  ['11-contact', '#contact', 0, 1000],
  ['12-footer', '.footer', 0.1, 900],
]

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
const errors = []
page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
page.on('pageerror', (err) => errors.push(err.message))

await page.goto(url, { waitUntil: 'networkidle' })

// Sites with an entry gate: capture it, then enter without sound.
const enter = page.locator('[data-enter="silent"]')
if (await enter.count()) {
  await enter.waitFor({ state: 'visible', timeout: 20000 })
  await page.screenshot({ path: `${outDir}/${prefix}-00-loader.png` })
  console.log(`saved ${prefix}-00-loader.png`)
  await enter.click()
}

const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length)
for (const [name, selector, offset, wait] of stops.filter(([name]) => !only || name.includes(only))) {
  await page.evaluate(
    ({ selector, offset }) => {
      const el = selector ? document.querySelector(selector) : null
      const y = el ? el.getBoundingClientRect().top + window.scrollY : 0
      window.scrollTo({ top: Math.max(0, y + offset * window.innerHeight), behavior: 'instant' })
    },
    { selector, offset },
  )
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `${outDir}/${prefix}-${name}.png` })
  console.log(`saved ${prefix}-${name}.png`)
}

if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'))
await browser.close()
