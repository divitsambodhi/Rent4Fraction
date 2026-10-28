/**
 * Production Bundle Guard (`scripts/check-prod-bundle.mjs`)
 * Ensures production client bundle contains zero Razorpay references,
 * zero placeholder lorem ipsum, and zero leaked test emails.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.resolve(__dirname, '../dist/assets')

if (!fs.existsSync(distDir)) {
  console.error(`[ERROR] Build directory not found at ${distDir}. Run 'npm run build' first.`)
  process.exit(1)
}

const FORBIDDEN_PATTERNS = [
  { name: 'Razorpay Gateway Identifier', regex: /checkout\.razorpay\.com/gi },
  { name: 'Razorpay Key Prefix', regex: /rzp_(?:test|live)_[a-zA-Z0-9]+/gi },
  { name: 'Lorem Ipsum Placeholder', regex: /lorem\s+ipsum/gi },
  { name: 'Dolor Sit Amet Placeholder', regex: /dolor\s+sit\s+amet/gi },
  { name: 'Example.com Domain', regex: /[a-zA-Z0-9._%+-]+@example\.com/gi },
]

const files = fs.readdirSync(distDir).filter((f) => f.endsWith('.js'))
let violationsCount = 0

console.log(`\n🔍 Inspecting production bundle in ${distDir} (${files.length} chunks)...`)

for (const file of files) {
  const filePath = path.join(distDir, file)
  const content = fs.readFileSync(filePath, 'utf8')

  for (const { name, regex } of FORBIDDEN_PATTERNS) {
    const matches = content.match(regex)
    if (matches && matches.length > 0) {
      console.error(`\n❌ [VIOLATION] ${name} found in chunk: ${file}`)
      console.error(`   Count: ${matches.length}`)
      console.error(`   Samples: ${matches.slice(0, 3).join(', ')}`)
      violationsCount += matches.length
    }
  }
}

if (violationsCount > 0) {
  console.error(`\n🚨 Production bundle check FAILED: ${violationsCount} forbidden pattern(s) detected.`)
  process.exit(1)
}

console.log(`\n✅ Production bundle check PASSED: Clean bundle with zero dormant gateway or placeholder leaks.\n`)
process.exit(0)

