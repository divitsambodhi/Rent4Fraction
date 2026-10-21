import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const srcDir = path.join(rootDir, 'src')
const indexHtml = path.join(rootDir, 'index.html')
const allowlistPath = path.join(__dirname, 'mobile-allowlist.json')

let allowlist = { entries: [] }
if (fs.existsSync(allowlistPath)) {
  try {
    allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'))
  } catch (e) {
    console.error('Failed to parse mobile-allowlist.json:', e)
  }
}

function isAllowlisted(filePath, ruleId) {
  const normalized = filePath.replace(/\\/g, '/')
  return allowlist.entries.some((entry) => {
    return entry.rule === ruleId && normalized.includes(entry.pattern)
  })
}

const checks = [
  {
    id: '100vh-or-h-screen',
    name: 'Use of 100vh or h-screen instead of dvh/svh',
    test: (content) => /\b(100vh|h-screen)\b/.test(content),
    detail: (line) => line.match(/\b(100vh|h-screen)\b/)?.[0],
  },
  {
    id: 'user-scalable-no',
    name: 'Disabling user pinch zoom or maximum-scale',
    test: (content) => /maximum-scale\s*=\s*1|user-scalable\s*=\s*no/.test(content),
    detail: (line) => line.match(/maximum-scale\s*=\s*1|user-scalable\s*=\s*no/)?.[0],
  },
  {
    id: 'overflow-x-hidden-root',
    name: 'Global overflow-x: hidden on html/body (breaks sticky)',
    test: (content) => /(body|html|\.root|RootLayout)[^{]*\{[^}]*overflow-x\s*:\s*hidden/.test(content),
    detail: () => 'overflow-x: hidden on layout root',
  },
  {
    id: 'adhoc-z-index',
    name: 'Ad-hoc arbitrary z-index (must use z-token scale 0/30/40/50/60/70/80)',
    test: (content) => /z-\[\d+\]/.test(content),
    detail: (line) => line.match(/z-\[\d+\]/)?.[0],
  },
  {
    id: 'large-fixed-width',
    name: 'Fixed widths above 320px on base mobile layout without responsive max-w',
    test: (content) => {
      const tokens = content.match(/\b([a-z0-9:-]+)?w-\[(\d+)px\]/g)
      if (!tokens) return false
      return tokens.some((token) => {
        if (/^(max-|min-|sm:|md:|lg:|xl:|2xl:)/.test(token)) return false
        const px = parseInt(token.replace(/.*w-\[(\d+)px\]/, '$1'), 10)
        return px > 320
      })
    },
    detail: (line) => {
      const tokens = line.match(/\b([a-z0-9:-]+)?w-\[(\d+)px\]/g) || []
      const offending = tokens.find(
        (t) => !/^(max-|min-|sm:|md:|lg:|xl:|2xl:)/.test(t) && parseInt(t.replace(/.*w-\[(\d+)px\]/, '$1'), 10) > 320
      )
      return offending || ''
    },
  },
]

function scanDirectory(dir, fileList = []) {
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === 'dist' || item === '.git') continue
      scanDirectory(fullPath, fileList)
    } else if (/\.(tsx|ts|jsx|js|css|html)$/.test(item)) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

console.log('📱 Running Mobile-First static guard (check:mobile)...')
const files = scanDirectory(srcDir)
if (fs.existsSync(indexHtml)) {
  files.push(indexHtml)
}

let violationCount = 0
const violationsByFile = {}

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    // Ignore comments
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return
    }

    for (const check of checks) {
      if (check.test(line)) {
        if (isAllowlisted(file, check.id)) {
          continue
        }

        violationCount++
        const relPath = path.relative(rootDir, file)
        if (!violationsByFile[relPath]) {
          violationsByFile[relPath] = []
        }
        violationsByFile[relPath].push({
          line: index + 1,
          rule: check.name,
          detail: check.detail ? check.detail(line) : '',
          snippet: trimmed.slice(0, 80),
        })
      }
    }
  })
}

if (violationCount > 0) {
  console.error(`\n❌ Found ${violationCount} mobile guideline violation(s):\n`)
  for (const [file, items] of Object.entries(violationsByFile)) {
    console.error(`  📄 ${file}`)
    for (const item of items) {
      console.error(`     Line ${item.line}: [${item.rule}] (${item.detail})`)
      console.error(`       > ${item.snippet}`)
    }
    console.error('')
  }
  console.error('Fix these at the root or document exemptions in scripts/mobile-allowlist.json with a valid reason.\n')
  process.exit(1)
} else {
  console.log('✅ Mobile-First static guard passed! No disallowed units, zoom blocks, or z-index violations found.')
  process.exit(0)
}
