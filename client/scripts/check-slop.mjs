import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const srcDir = path.join(rootDir, 'src')

// Banned phrases from section 6
const BANNED_PHRASES = [
  'seamless',
  'effortless',
  'elevate',
  'unlock',
  'streamline',
  'revolutionize',
  'game-changer',
  'all-in-one',
  'cutting-edge',
  'next-level',
  'supercharge',
  'welcome back',
  'oops',
]

// Disallowed fonts from section 3 (exact word match so setInterval / Interval is not flagged)
const BANNED_FONTS = [
  'Inter',
  'Geist',
  'Space Grotesk',
  'Avenir',
  'Recline',
]

// Prohibited brand mention
const BANNED_BRANDS = ['furlenco']

const checks = [
  {
    id: 'em-en-dash',
    name: 'Em or en dashes in strings',
    test: (content) => /[\u2013\u2014]/.test(content),
    detail: (line) => line.match(/[\u2013\u2014]/)?.[0],
  },
  {
    id: 'banned-phrases',
    name: 'Banned marketing buzzwords',
    test: (content) => {
      // Ignore comment lines mentioning guidelines
      if (/^\s*(\/\/|\/\*|\*)/.test(content) && content.includes('banned buzzwords')) {
        return false
      }
      const lower = content.toLowerCase()
      return BANNED_PHRASES.some((p) => new RegExp(`\\b${p}\\b`, 'i').test(lower))
    },
    detail: (line) => {
      const lower = line.toLowerCase()
      return BANNED_PHRASES.find((p) => new RegExp(`\\b${p}\\b`, 'i').test(lower))
    },
  },
  {
    id: 'banned-fonts',
    name: 'Disallowed font imports/names',
    test: (content) => {
      return BANNED_FONTS.some((f) => new RegExp(`\\b${f}\\b`).test(content))
    },
    detail: (line) => BANNED_FONTS.find((f) => new RegExp(`\\b${f}\\b`).test(line)),
  },
  {
    id: 'reference-brand',
    name: 'Reference brand name in code/UI',
    test: (content) => {
      const lower = content.toLowerCase()
      return BANNED_BRANDS.some((b) => lower.includes(b))
    },
    detail: (line) => BANNED_BRANDS.find((b) => line.toLowerCase().includes(b)),
  },
]

function scanDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath, fileList)
      }
    } else if (/\.(tsx|ts|jsx|js|css|html)$/.test(entry.name)) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

export function runSlopCheck() {
  const files = scanDir(srcDir)
  const violations = []

  let allowlist = ''
  const allowlistPath = path.join(rootDir, 'slop-allowlist.txt')
  if (fs.existsSync(allowlistPath)) {
    allowlist = fs.readFileSync(allowlistPath, 'utf-8')
  }

  for (const file of files) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/')
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      const lineNum = idx + 1
      for (const check of checks) {
        if (check.test(line)) {
          const matchDetail = check.detail(line)
          const allowEntry = `${relPath}:${matchDetail}`
          if (!allowlist.includes(relPath) && !allowlist.includes(allowEntry)) {
            violations.push({
              rule: check.name,
              file: relPath,
              line: lineNum,
              detail: matchDetail || line.trim(),
              snippet: line.trim().slice(0, 80),
            })
          }
        }
      }
    })
  }

  return violations
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const violations = runSlopCheck()
  if (violations.length > 0) {
    console.error(`\n❌ Slop check failed with ${violations.length} violation(s):\n`)
    violations.forEach((v) => {
      console.error(`  ${v.file}:${v.line} - [${v.rule}] -> ${v.detail}`)
      console.error(`    "${v.snippet}"`)
    })
    console.error('\nFix the issues above or add a documented justification in slop-allowlist.txt.\n')
    process.exit(1)
  } else {
    console.log('✅ Slop check passed! Zero AI-slop or banned patterns detected in src/.')
    process.exit(0)
  }
}
