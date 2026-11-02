import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const input = path.resolve('photos/approved')
const output = path.resolve('public/images/class')
await fs.mkdir(output, { recursive: true })
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const files = (await fs.readdir(input, { withFileTypes: true })).filter((entry) => entry.isFile() && allowed.has(path.extname(entry.name).toLowerCase()))

for (const file of files) {
  const target = path.join(output, `${path.parse(file.name).name}.webp`)
  await sharp(path.join(input, file.name)).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(target)
  process.stdout.write(`Optimized ${file.name} → ${path.basename(target)}\n`)
}
if (!files.length) process.stdout.write('No photos found in photos/approved. Nothing was copied to the public site.\n')
