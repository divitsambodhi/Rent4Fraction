import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'

describe('Automated Slop Guard', () => {
  it('detects no banned phrases, dashes, or disallowed fonts in src/', () => {
    const rootDir = path.resolve(__dirname, '../../../')
    const result = execSync('node scripts/check-slop.mjs', {
      cwd: rootDir,
      encoding: 'utf-8',
    })
    expect(result).toContain('Slop check passed')
  })
})
