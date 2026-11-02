import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const svg = await fs.readFile(path.resolve('public/favicon.svg'))
const png = await sharp(svg).resize(48, 48).png().toBuffer()
const header = Buffer.alloc(22)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)
header.writeUInt8(48, 6)
header.writeUInt8(48, 7)
header.writeUInt8(0, 8)
header.writeUInt8(0, 9)
header.writeUInt16LE(1, 10)
header.writeUInt16LE(32, 12)
header.writeUInt32LE(png.length, 14)
header.writeUInt32LE(22, 18)
await fs.writeFile(path.resolve('public/favicon.ico'), Buffer.concat([header, png]))
process.stdout.write('Created public/favicon.ico\n')
