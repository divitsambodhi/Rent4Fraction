/**
 * Raw Image Check (`scripts/check-raw-img.mjs`)
 * Ensures no raw <img> tags are used for user or equipment content across the codebase.
 * All image rendering must go through <CloudImage> or <ProductImage>.
 * Allowed exception: src/components/shared/cloud-image.tsx (the sole underlying primitive).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const srcDir = path.resolve(__dirname, '../src')

const ALLOWED_FILES = [
  path.resolve(srcDir, 'components/shared/cloud-image.tsx'),
]

function walk(dir) {
  let files = []
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '__tests__') {
        files = files.concat(walk(fullPath))
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      files.push(fullPath)
    }
  }
  return files
}

const files = walk(srcDir)
let violations = 0

console.log(`\n🔍 Checking for raw <img> tags in ${files.length} UI components...`)

for (const file of files) {
  if (ALLOWED_FILES.includes(path.resolve(file))) {
    continue
  }

  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    // Check for <img opening tag
    if (/<img\b/i.test(line)) {
      const relPath = path.relative(srcDir, file)
      console.error(`❌ [VIOLATION] Raw <img> tag found at src/${relPath}:${index + 1}`)
      console.error(`   ${line.trim()}`)
      console.error(`   Use <CloudImage> or <ProductImage> instead.\n`)
      violations++
    }
  })
}

if (violations > 0) {
  console.error(`❌ Raw <img> check FAILED: ${violations} raw <img> tag(s) detected outside <CloudImage>.`)
  process.exit(1)
}

console.log(`✅ Raw <img> check PASSED: Zero unauthorized raw <img> tags found. All images use <CloudImage>.\n`)
process.exit(0)

