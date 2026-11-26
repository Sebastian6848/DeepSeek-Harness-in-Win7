import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, it } from 'vitest'
import { win7HostEnvironment } from '../src/win7-environment.ts'

it('exposes bundled tools and UTF-8 defaults to the Windows Host without changing system PATH', () => {
  const resources = mkdtempSync(join(tmpdir(), 'dsh-win7-env-'))
  try {
    for (const file of ['runtime/pwsh/pwsh.exe', 'runtime/primary-runtime/dependencies/node/bin/node.exe',
      'runtime/primary-runtime/dependencies/python/python.exe', 'runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs',
      'runtime/win7-shell/pnpm.cmd']) {
      const path = join(resources, file)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, '')
    }
    const parent = { Path: 'C:\\user\\bin', pythonutf8: '0' }
    const result = win7HostEnvironment(parent, resources, 'win32', '6.1.7601')
    expect(result.Path?.split(';')).toEqual([
      join(resources, 'runtime/pwsh'), join(resources, 'runtime/primary-runtime/dependencies/node/bin'),
      join(resources, 'runtime/primary-runtime/dependencies/python'), join(resources, 'runtime/win7-shell'), parent.Path,
    ])
    expect(result.PYTHONIOENCODING).toBe('utf-8')
    expect(result).not.toHaveProperty('PYTHONUTF8')
    expect(result.pythonutf8).toBe('0')
    expect(win7HostEnvironment({}, resources, 'win32', '6.1.7601').PYTHONUTF8).toBe('1')
    expect(win7HostEnvironment(parent, resources, 'linux', '6.1.7601')).toBe(parent)
    expect(win7HostEnvironment(parent, join(resources, 'absent'), 'win32', '6.1.7601')).toBe(parent)
    expect(parent).toEqual({ Path: 'C:\\user\\bin', pythonutf8: '0' })
  } finally { rmSync(resources, { recursive: true, force: true }) }
})
