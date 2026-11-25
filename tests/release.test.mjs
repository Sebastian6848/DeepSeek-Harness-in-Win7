import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'

const windowsPowerShell = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
const executable = process.platform === 'win32' ? 'powershell.exe' : existsSync(windowsPowerShell) ? windowsPowerShell : null
const windowsPath = path => process.platform === 'win32' ? path : execFileSync('wslpath', ['-w', path], { encoding: 'utf8' }).trim()
const quote = value => "'" + value.replaceAll("'", "''") + "'"

function prepare(directory, stale) {
  const input = join(directory, 'input'), output = join(directory, 'output')
  mkdirSync(input); mkdirSync(output)
  const version = '0.2.2-rc.5.3'
  writeFileSync(join(input, `deepseek-harness-${version}-win-x64-unsigned.exe`), 'new installer')
  if (stale) writeFileSync(join(output, 'nightly.yml'), 'old feed')
  const script = `$ErrorActionPreference='Stop'; try { & ${quote(windowsPath(resolve('scripts/prepare-win7-release.ps1')))} -Version '${version}' -Artifacts ${quote(windowsPath(input))} -Out ${quote(windowsPath(output))}; exit 0 } catch { Write-Output $_.Exception.Message; exit 7 }`
  const result = spawnSync(executable, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { encoding: 'utf8', timeout: 30000 })
  if (result.error) throw result.error
  return { result, output }
}

test('offline release has an installer/checksum and refuses stale update metadata', { skip: !executable }, () => {
  for (const stale of [false, true]) {
    const directory = mkdtempSync(join(tmpdir(), 'dsh-release-test-'))
    try {
      const { result, output } = prepare(directory, stale)
      if (stale) {
        assert.notEqual(result.status, 0)
        assert.match(result.stdout, /output directory must be empty/i)
        assert.deepEqual(readdirSync(output), ['nightly.yml'])
        assert.equal(readFileSync(join(output, 'nightly.yml'), 'utf8'), 'old feed')
      } else {
        assert.equal(result.status, 0, result.stdout + result.stderr)
        assert.deepEqual(readdirSync(output).sort(), ['SHA256SUMS.txt', 'deepseek-harness-0.2.2-rc.5.3-win7-x64-unsigned.exe'])
      }
    } finally { rmSync(directory, { recursive: true, force: true }) }
  }
})
