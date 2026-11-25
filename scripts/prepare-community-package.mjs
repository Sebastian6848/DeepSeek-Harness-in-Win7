/** Reuse the pinned community binaries, overlay our built code, and reseal the runtime. Build machine only. */
import { createHash } from 'node:crypto'
import { spawnSync, execFileSync } from 'node:child_process'
import { createReadStream, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const root = fileURLToPath(new URL('../', import.meta.url))
export const APP_ID = 'local.sebastian.deepseek-harness-win7-intranet'
export const DEFAULT_VERSION = '0.2.2-rc.5.3'
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
export const canonicalArchivePath = path => path.replaceAll('\\', '/').replace(/^\/+/, '')
const nativeArchivePath = path => join(...canonicalArchivePath(path).split('/'))

export function readArchiveEntries(asar, archive) {
  return new Map(asar.listPackage(archive).map(path => [canonicalArchivePath(path), asar.statFile(archive, nativeArchivePath(path))]))
}

export async function rebuildArchive(asar, archive, source, originalEntries) {
  asar.uncache(archive)
  rmSync(archive); rmSync(`${archive}.unpacked`, { recursive: true, force: true })
  const streams = readdirSync(source, { recursive: true, withFileTypes: true }).map(entry => {
    const path = join(entry.parentPath, entry.name), name = canonicalArchivePath(relative(source, path))
    if (!entry.isDirectory() && !entry.isFile()) throw new Error(`Unexpected source link: ${name}`)
    return { path: nativeArchivePath(name), type: entry.isDirectory() ? 'directory' : 'file', stat: statSync(path),
      unpacked: originalEntries.get(name)?.unpacked === true, streamGenerator: () => createReadStream(path) }
  })
  await asar.createPackageFromStreams(archive, streams)
}

export function verifySeed(path, seed, label = 'Pinned community installer') {
  if (statSync(path).size !== seed.bytes || hash(path) !== seed.sha256) throw new Error(`${label} checksum mismatch`)
}

function files(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true }).filter(x => x.isFile())
    .map(x => relative(root, join(x.parentPath, x.name)).replaceAll('\\', '/')).sort()
}

/** All executable/native bytes, including extensionless PE shims, must survive unchanged. */
export function nativeInventory(directory) {
  return files(directory).filter(name => {
    const path = join(directory, name)
    const body = readFileSync(path)
    return /\.(exe|dll|node|pyd)$/iu.test(name) || (body[0] === 0x4d && body[1] === 0x5a)
  }).map(path => ({ path, sha256: hash(join(directory, path)) }))
}

export function assertNativeUnchanged(expected, directory) {
  if (JSON.stringify(expected) !== JSON.stringify(nativeInventory(directory))) throw new Error('A reused Win7 native binary changed')
}

/** Verify the final archive, rather than relying only on the input directory inventory. */
export function verifyArchiveRuntime(asar, archive, descriptor) {
  const expected = new Set(descriptor.files.map(entry => `dsh/${entry.path}`))
  for (const path of asar.listPackage(archive).map(canonicalArchivePath).filter(name => name.startsWith('dsh/'))) {
    const entry = asar.statFile(archive, nativeArchivePath(path))
    if (!entry.files && path !== 'dsh/desktop-runtime.json' && !expected.has(path)) throw new Error(`Unexpected archived runtime file: ${path}`)
  }
  for (const entry of descriptor.files) {
    const body = asar.extractFile(archive, nativeArchivePath(`dsh/${entry.path}`))
    if (body.length !== entry.bytes || createHash('sha256').update(body).digest('hex') !== entry.sha256) {
      throw new Error(`Archived runtime checksum mismatch: ${entry.path}`)
    }
  }
}

function extract(tool, archive, output) {
  const result = spawnSync(tool, ['x', '-y', `-o${output}`, archive], { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`7-Zip extraction failed: ${result.status}`)
}

async function main() {
  const { values } = parseArgs({ options: {
    installer: { type: 'string' }, sevenzip: { type: 'string' }, output: { type: 'string' },
    'chromium-notices': { type: 'string' },
    version: { type: 'string', default: DEFAULT_VERSION },
  } })
  if (!values.installer || !values.sevenzip || !values.output || !values['chromium-notices']) throw new Error('Required: --installer <pinned exe> --sevenzip <7z executable> --chromium-notices <verified LICENSES.chromium.html> --output <empty directory>')
  const lock = JSON.parse(readFileSync(join(root, 'sources.lock.json')))
  verifySeed(resolve(values.installer), lock.binary_seed)
  verifySeed(resolve(values['chromium-notices']), lock.chromium_notices, 'Chromium notices')
  const output = resolve(values.output)
  if (existsSync(output) && readdirSync(output).length) throw new Error('Output directory must be empty')
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(values.version)) throw new Error('Invalid build version')
  const require = createRequire(join(root, 'deepseek-harness/apps/desktop/package.json'))
  const asar = createRequire(require.resolve('app-builder-lib/package.json'))('@electron/asar')
  const { writeDesktopRuntimeAsync, verifyDesktopRuntime } = await import(pathToFileURL(join(root, 'deepseek-harness/apps/desktop/lib/types/runtime-tree.js')))
  const app = join(output, 'application'), work = join(output, 'work'), source = join(work, 'asar')
  mkdirSync(work, { recursive: true })
  extract(values.sevenzip, resolve(values.installer), join(work, 'nsis'))
  extract(values.sevenzip, join(work, 'nsis/$PLUGINSDIR/app-64.7z'), app)
  const resources = join(app, 'resources'), archive = join(resources, 'app.asar')
  const originalEntries = readArchiveEntries(asar, archive)
  asar.extractAll(archive, source)
  const dsh = join(source, 'dsh')
  const descriptor = await verifyDesktopRuntime(dsh, '0.2.2-rc.5', { platform: 'win32', arch: 'x64' })
  const natives = nativeInventory(dsh), outerNatives = nativeInventory(app)
  const overlays = [
    ['packages/boot/app-boot', ['index.js', 'worker/profile-resolution-bootstrap.js']],
    ['packages/llm/llm-pi-ai', ['index.js']],
    ['packages/client/ui-settings-models', ['index.js', 'client.js']],
  ]
  const replaced = []
  for (const [location, names] of overlays) {
    const packageRoot = join(root, 'deepseek-harness', location)
    const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json')))
    const target = join(dsh, 'node_modules', manifest.name)
    if (!existsSync(target)) throw new Error(`Seed is missing ${manifest.name}`)
    for (const name of names) {
      const built = join(packageRoot, 'lib', name), destination = join(target, 'lib', name)
      if (!existsSync(built)) throw new Error(`Run the complete source build first: ${location}/lib/${name}`)
      mkdirSync(dirname(destination), { recursive: true }); cpSync(built, destination)
      replaced.push({ path: relative(source, destination).replaceAll('\\', '/'), sha256: hash(destination) })
    }
    // Keep the source shipped alongside these packages consistent with their compiled code.
    if (existsSync(join(target, 'src'))) {
      rmSync(join(target, 'src'), { recursive: true }); cpSync(join(packageRoot, 'src'), join(target, 'src'), { recursive: true })
    }
  }
  for (const name of ['main.js', 'operation-report-worker.js', 'preload-app.cjs', 'preload-mandatory.cjs',
    'preload-platform-account.cjs', 'preload-update-dialog.cjs', 'preload-welcome.cjs']) {
    const built = join(root, 'deepseek-harness/apps/desktop/lib', name)
    cpSync(built, join(source, 'lib', name)); replaced.push({ path: `lib/${name}`, sha256: hash(built) })
  }
  rmSync(join(source, 'lib/welcome'), { recursive: true, force: true })
  cpSync(join(root, 'deepseek-harness/apps/desktop/lib/welcome'), join(source, 'lib/welcome'), { recursive: true })
  const manifest = JSON.parse(readFileSync(join(source, 'package.json')))
  manifest.version = values.version; manifest.dshDesktopAppId = APP_ID
  delete manifest.dshMandatoryUpdatePolicy
  delete manifest.dshDesktopUpdateChannel
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim() !== ''
  manifest.dshBuildCommit = commit; manifest.dshBuildDirty = dirty
  writeFileSync(join(source, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  assertNativeUnchanged(natives, dsh)
  const sealed = await writeDesktopRuntimeAsync(dsh, descriptor.release, descriptor.sharedPackages.map(x => x.name), { platform: 'win32', arch: 'x64' })
  await verifyDesktopRuntime(dsh, descriptor.release.version, { platform: 'win32', arch: 'x64' })
  await rebuildArchive(asar, archive, source, originalEntries)
  verifyArchiveRuntime(asar, archive, sealed)
  for (const [name, entry] of originalEntries) {
    if (entry.unpacked && !entry.files && asar.statFile(archive, nativeArchivePath(name)).unpacked !== true) throw new Error(`Lost native unpack placement: ${name}`)
  }
  for (const entry of replaced) {
    if (createHash('sha256').update(asar.extractFile(archive, nativeArchivePath(entry.path))).digest('hex') !== entry.sha256) throw new Error(`Overlay lost: ${entry.path}`)
  }
  assertNativeUnchanged(outerNatives, app)
  rmSync(join(resources, 'app-update.yml'), { force: true })
  cpSync(resolve(values['chromium-notices']), join(app, 'LICENSES.chromium.html'))
  const provenance = { schemaVersion: 1, version: values.version, sourceRepository: lock.project_repository,
    sourceCommit: commit, sourceDirty: dirty, binarySeed: lock.binary_seed, chromiumNotices: lock.chromium_notices, replaced, runtimeFiles: sealed.files.length,
    reusedNativeFiles: natives.length, externalNetworkDefault: false, win7MachineValidated: false }
  writeFileSync(join(app, 'INTRANET-BUILD.json'), JSON.stringify(provenance, null, 2) + '\n')
  cpSync(join(root, 'LICENSE'), join(app, 'LICENSE-INTRANET.txt'))
  writeFileSync(join(app, 'INTRANET-README.txt'), 'Windows 7 SP1 x64 intranet preview.\r\nConfigure Settings > Models > Custom API: URL, model (default ds), optional key.\r\nExternal search, accounts, updates, telemetry and plugin downloads are disabled by default.\r\nSource and licenses: https://github.com/Sebastian6848/DeepSeek-Harness-in-Win7\r\nNative components are reused from the pinned factfinding release; their bundled licenses remain intact.\r\nReal Windows 7 testing is still required.\r\n')
  console.log(`Prepared ${app}; preserved ${natives.length} Win7 native runtime files and verified every overlaid bundle.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
