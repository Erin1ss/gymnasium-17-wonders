import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source = path.resolve('design/city-map-original.png')
const target = path.resolve('public/images/city-map.webp')
await fs.mkdir(path.dirname(target), { recursive: true })
await sharp(source).resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 84, effort: 5 }).toFile(target)
const { size } = await fs.stat(target)
process.stdout.write(`Created ${path.relative(process.cwd(), target)} (${Math.round(size / 1024)} KB)\n`)
