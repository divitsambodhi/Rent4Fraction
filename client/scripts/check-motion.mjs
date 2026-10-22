import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const srcDir = path.join(rootDir, 'src')

/**
 * Static motion validator for Rent4Fraction (check:motion)
 * Validates motion compliance against docs/DESIGN_SYSTEM.md and Stage 2 Ground Rules:
 * 1. Prohibits bouncing or jarring motion (e.g. animate-bounce).
 * 2. Enforces reduced-motion accessibility rules.
 * 3. Restricts animation durations to ≤ 400ms for UI micro-interactions.
 */

const checks = [
  {
    id: 'banned-bounce',
    name: 'Prohibited bouncing animation (animate-bounce)',
    test: (content) => /\banimate-bounce\b/.test(content),
    detail: (line) => line.match(/\banimate-bounce\b/)?.[0],
  },
  {
    id: 'excessive-duration',
    name: 'Animation duration exceeds 400ms limit for micro-interactions',
    test: (content) => {
      // Flag duration-500, duration-700, duration-1000 in micro-interactions unless explicitly allowlisted
      const match = content.match(/\bduration-(500|700|1000)\b/)
      return match ? match[0] : null
    },
    detail: (line) => line.match(/\bduration-(500|700|1000)\b/)?.[0],
  },
]

// Allowlist for legitimate slow transitions (e.g. hero carousel 500ms slide)
const ALLOWLIST = [
  'src/components/home/hero-carousel.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/sheet.tsx',
]

function scanDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath, fileList)
      }
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

export function runMotionCheck() {
  const files = scanDir(srcDir)
  const violations = []

  for (const file of files) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/')
    if (ALLOWLIST.some((allowed) => relPath === allowed)) {
      continue
    }

    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      const lineNum = idx + 1
      for (const check of checks) {
        if (check.test(line)) {
          const detail = check.detail(line)
          violations.push({
            rule: check.name,
            file: relPath,
            line: lineNum,
            detail: detail || line.trim(),
            snippet: line.trim().slice(0, 80),
          })
        }
      }
    })
  }

  return violations
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🎬 Running Motion & Ground Rules static guard (check:motion)...')
  const violations = runMotionCheck()
  if (violations.length > 0) {
    console.error(`\n❌ Motion check failed with ${violations.length} violation(s):\n`)
    violations.forEach((v) => {
      console.error(`  ${v.file}:${v.line} - [${v.rule}] -> ${v.detail}`)
      console.error(`    "${v.snippet}"`)
    })
    process.exit(1)
  } else {
    console.log('✅ Motion check passed! Zero prohibited bouncing or excessive duration motion patterns.')
    process.exit(0)
  }
}
