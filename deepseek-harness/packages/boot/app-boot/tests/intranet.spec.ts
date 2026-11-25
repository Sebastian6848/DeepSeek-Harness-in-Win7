/** Verify the intranet policy against the actual bundled preset compositions. */
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { EntryOptions } from '@deepseek-ai/cordis-plugin-loader'
import { composeEntries, loadOptionalPatches } from '../src/index.ts'
import { intranetProfilePatches } from '../src/intranet-defaults.ts'

function walk(rows: readonly EntryOptions[]): EntryOptions[] {
  return rows.flatMap((row) => {
    const children = row.group && Array.isArray(row.config) ? walk(row.config) : []
    const preset = row.name === '@deepseek-ai/dsh-agent-preset' && Array.isArray(row.config?.plugins)
      ? walk(row.config.plugins) : []
    return [row, ...children, ...preset]
  })
}

describe('intranet shipped composition', () => {
  it('disables web tools in every shipped preset while retaining local tools', () => {
    const files = ['../base/cordis.patch.yml', 'cordis.patch.yml',
      'presets/standard.patch.yml', 'presets/ptc.patch.yml', 'presets/minimal.patch.yml', 'presets/cordis.patch.yml']
    const base = new URL('../../../bundle/web-app/', import.meta.url)
    const patches = files.flatMap(file => loadOptionalPatches('test', fileURLToPath(new URL(file, base))) ?? [])
    const original = composeEntries([patches])
    const safe = composeEntries([patches, intranetProfilePatches(original)])
    const all = walk(safe)
    const webTools = all.filter(row => row.name === '@deepseek-ai/dsh-tool-web')
    expect(webTools.length).toBeGreaterThan(1)
    expect(webTools.every(row => row.disabled === true)).toBe(true)
    const installers = all.filter(row => row.name === '@deepseek-ai/dsh-plugin-manager/tools')
    expect(installers.length).toBeGreaterThan(0)
    expect(installers.every(row => row.disabled === true)).toBe(true)
    expect(all.some(row => row.name === '@deepseek-ai/dsh-tool-fs' && row.disabled !== true)).toBe(true)
    expect(all.filter(row => ['@deepseek-ai/dsh-deepseek-account', '@deepseek-ai/dsh-session-log-deepseek',
      '@deepseek-ai/dsh-session-telemetry-otel'].includes(row.name ?? '')).every(row => row.disabled === true)).toBe(true)
    expect(all.find(row => row.name === '@deepseek-ai/dsh-client-ui-settings-models')?.config)
      .toEqual({ credentialOnboarding: false, intranetDefaults: true })
  })
})
