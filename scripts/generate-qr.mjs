import fs from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'

const url = process.env.PAGES_URL || 'https://erin1ss.github.io/gymnasium-17-wonders/'
const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 240, color: { dark: '#071522', light: '#f1e7d5' } })
for (const folder of ['posters', 'public']) {
  const directory = path.resolve(folder)
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(path.join(directory, 'site-qr.svg'), svg, 'utf8')
}
await fs.copyFile(path.resolve('posters/poster-mockup.svg'), path.resolve('public/poster-mockup.svg'))
process.stdout.write(`QR target: ${url}\nPoster preview copied to public/poster-mockup.svg\n`)
