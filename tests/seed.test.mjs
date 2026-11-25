import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifySeed, nativeInventory, assertNativeUnchanged } from '../scripts/prepare-community-package.mjs'

test('repack rejects an altered seed before extraction and detects native changes including extensionless PE files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-seed-'))
  try {
    const seed = join(directory, 'seed.exe'); writeFileSync(seed, 'seed')
    const lock = { bytes: 4, sha256: createHash('sha256').update('seed').digest('hex') }
    assert.doesNotThrow(() => verifySeed(seed, lock))
    writeFileSync(seed, 'fake'); assert.throws(() => verifySeed(seed, lock), /checksum/)
    const runtime = join(directory, 'runtime'); mkdirSync(runtime)
    writeFileSync(join(runtime, 'python'), 'MZbinary'); writeFileSync(join(runtime, 'native.node'), 'native')
    writeFileSync(join(runtime, 'code.js'), 'first')
    const before = nativeInventory(runtime); assert.equal(before.length, 2)
    writeFileSync(join(runtime, 'code.js'), 'patched'); assert.doesNotThrow(() => assertNativeUnchanged(before, runtime))
    writeFileSync(join(runtime, 'python'), 'MZchanged'); assert.throws(() => assertNativeUnchanged(before, runtime), /native binary/)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
