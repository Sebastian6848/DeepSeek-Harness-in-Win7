/** Windows build host: package the verified prepared application with the pinned community NSIS integration. */
import { execFileSync } from 'node:child_process'
import { createRequire, Module } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { APP_ID } from './prepare-community-package.mjs'

if (process.platform !== 'win32') throw new Error('Run this packaging step on Windows x64')
const { values } = parseArgs({ options: { prepared: { type: 'string' }, output: { type: 'string' }, tools: { type: 'string' } } })
if (!values.prepared || !values.output || !values.tools) throw new Error('Required: --prepared <application> --output <artifacts> --tools <npm build-tools directory>')
const root = fileURLToPath(new URL('../', import.meta.url))
const desktop = join(root, 'deepseek-harness/apps/desktop')
// Only this build process receives an alternate module lookup directory.
process.env.NODE_PATH = join(resolve(values.tools), 'node_modules'); Module._initPaths()
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
process.env.DSH_ALLOW_EXTERNAL_NETWORK = '0'
process.env.ELECTRON_BUILDER_7Z_FILTER = 'BCJ'
// Match the community Windows packaging default; downloads happen only on this build host.
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ??= '3'
const require = createRequire(join(resolve(values.tools), 'package.json'))
const builderRequire = createRequire(require.resolve('electron-builder/package.json'))
if (builderRequire('app-builder-lib/package.json').version !== '26.17.0') throw new Error('Packaging requires the pinned app-builder-lib 26.17.0')
for (const name of Object.keys(process.env)) if (/^(?:WIN_)?CSC_/iu.test(name)) delete process.env[name]
const { build, Platform, Arch } = require('electron-builder')
const { installWindowsDirectoryInstaller } = await import('../deepseek-harness/apps/desktop/scripts/windows-directory-installer.mjs')
const { readInstallerLocales, renderInstallerStrings } = await import('../deepseek-harness/apps/desktop/scripts/installer-locales.mjs')
installWindowsDirectoryInstaller(builderRequire)
const output = resolve(values.output), ui = join(desktop, '.desktop-build/targets/win-x64/installer-ui')
mkdirSync(output, { recursive: true })
execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
  join(desktop, 'scripts/prepare-windows-installer.ps1'), '-OutputDirectory', ui], { stdio: 'inherit' })
writeFileSync(join(ui, 'strings.nsh'), renderInstallerStrings(readInstallerLocales()))
const metadata = JSON.parse(require('@electron/asar').extractFile(join(resolve(values.prepared), 'resources/app.asar'), 'package.json'))
if (metadata.dshDesktopAppId !== APP_ID || metadata.dshMandatoryUpdatePolicy) throw new Error('Unexpected application policy metadata')
await build({ prepackaged: resolve(values.prepared), projectDir: desktop, targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64), publish: 'never', config: {
  appId: APP_ID, productName: 'DeepSeek Harness', electronVersion: '44.2.0',
  extraMetadata: { version: metadata.version },
  artifactName: `deepseek-harness-${metadata.version}-win7-x64-intranet-unsigned.exe`,
  directories: { output }, publish: null,
  win: { icon: join(desktop, 'resources/icon-windows.png'), forceCodeSigning: false, signExecutable: false, target: ['nsis'] },
  nsis: { uninstallDisplayName: '${productName}',
    installerSidebar: join(ui, 'uninstaller-sidebar.bmp'), uninstallerSidebar: join(ui, 'uninstaller-sidebar.bmp'),
    include: join(desktop, 'scripts/installer.nsh'), oneClick: false, perMachine: false, allowElevation: false,
    // The prepared tree already contains the pinned helper. Never replace it with a downloaded executable.
    packElevateHelper: false,
    allowToChangeInstallationDirectory: false, installerLanguages: readInstallerLocales().map(x => x.id), differentialPackage: true },
} })
writeFileSync(join(output, 'packaging-complete.json'), JSON.stringify({ version: metadata.version, sourceCommit: metadata.dshBuildCommit, externalNetworkDefault: false }) + '\n')
console.log(`Offline installer artifacts: ${output}`)
