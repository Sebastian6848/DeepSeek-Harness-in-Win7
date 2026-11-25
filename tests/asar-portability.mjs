/** Integration check on Linux or Windows using the pinned packaging dependency, without network or a real app. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { readArchiveEntries, rebuildArchive, verifyArchiveRuntime } from '../scripts/prepare-community-package.mjs'

const require = createRequire(join(resolve(process.argv[2] ?? 'deepseek-harness/apps/desktop'), 'package.json'))
const asar = createRequire(require.resolve('app-builder-lib/package.json'))('@electron/asar')
const temporary = mkdtempSync(join(tmpdir(), 'dsh-asar-portability-'))
try {
  const source = join(temporary, 'source'), archive = join(temporary, 'app.asar'), extracted = join(temporary, 'extracted')
  mkdirSync(join(source, 'dsh/native/nested'), { recursive: true })
  const native = Buffer.from('MZ test native fixture'), code = Buffer.from('original code'), updated = Buffer.from('updated application code')
  writeFileSync(join(source, 'dsh/native/nested/fixture.dll'), native)
  writeFileSync(join(source, 'dsh/code.js'), code)
  await asar.createPackageWithOptions(source, archive, { unpack: '**/*.dll' })
  const entries = readArchiveEntries(asar, archive)
  assert.equal(entries.get('dsh/native/nested/fixture.dll')?.unpacked, true)
  asar.extractAll(archive, extracted)
  writeFileSync(join(extracted, 'dsh/code.js'), updated)
  await rebuildArchive(asar, archive, extracted, entries)
  assert.equal(readArchiveEntries(asar, archive).get('dsh/native/nested/fixture.dll')?.unpacked, true)
  assert.deepEqual(readFileSync(join(`${archive}.unpacked`, 'dsh/native/nested/fixture.dll')), native)
  const descriptor = { files: [['native/nested/fixture.dll', native], ['code.js', updated]].map(([path, body]) =>
    ({ path, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') })) }
  verifyArchiveRuntime(asar, archive, descriptor)
  console.log(`PASS ${process.platform}: nested ASAR unpack placement, replaced application bytes and complete archive inventory`)
} finally { rmSync(temporary, { recursive: true, force: true }) }
