/** Expose the packaged Windows interpreters to the Host and its child processes. */

import { existsSync } from 'node:fs'
import { release } from 'node:os'
import { join } from 'node:path'

/**
 * Whether an `os.release()` string names Windows before 8 (NT 6.2).
 * @param osRelease - Windows kernel version such as `6.1.7601`.
 * @returns true for NT 6.1 and older.
 */
export function isPreWindows8(osRelease: string): boolean {
  const [major = 0, minor = 0] = osRelease.split('.').map(Number)
  return major < 6 || (major === 6 && minor < 2)
}

/**
 * Expose the trusted, read-only packaged Python and Node, and prefer bundled PowerShell on Windows 7.
 * @param environment - Host environment before the change.
 * @param resourcesPath - Packaged application's resources directory.
 * @param platform - Current platform.
 * @param osRelease - Current kernel version.
 * @returns A Host-only environment. Explicit Python encoding settings remain authoritative.
 */
export function win7HostEnvironment(
  environment: NodeJS.ProcessEnv,
  resourcesPath: string,
  platform: NodeJS.Platform = process.platform,
  osRelease: string = release(),
): NodeJS.ProcessEnv {
  if (platform !== 'win32') return environment
  const pwsh = join(resourcesPath, 'runtime', 'pwsh')
  const dependencies = join(resourcesPath, 'runtime', 'primary-runtime', 'dependencies')
  const node = join(dependencies, 'node', 'bin')
  const python = join(dependencies, 'python')
  const launchers = join(resourcesPath, 'runtime', 'win7-shell')
  const hasNode = existsSync(join(node, 'node.exe'))
  const hasPython = existsSync(join(python, 'python.exe'))
  const paths = [
    ...(isPreWindows8(osRelease) && existsSync(join(pwsh, 'pwsh.exe')) ? [pwsh] : []),
    ...(hasNode ? [node] : []),
    ...(hasPython ? [python] : []),
    ...(hasNode && existsSync(join(dependencies, 'pnpm', 'bin', 'pnpm.mjs')) && existsSync(join(launchers, 'pnpm.cmd')) ? [launchers] : []),
  ]
  if (paths.length === 0) return environment
  // A spread Windows environment keeps the original key case (usually "Path"); reuse it.
  const keys = Object.keys(environment)
  const key = keys.find(name => name.toUpperCase() === 'PATH') ?? 'Path'
  const path = [ ...paths, environment[key] ].filter(Boolean).join(';')
  const result = { ...environment, [key]: path }
  if (hasPython) {
    const configured = (name: string) => keys.some(key => key.toUpperCase() === name && environment[key] !== undefined)
    if (!configured('PYTHONUTF8')) result.PYTHONUTF8 = '1'
    if (!configured('PYTHONIOENCODING')) result.PYTHONIOENCODING = 'utf-8'
  }
  return result
}
