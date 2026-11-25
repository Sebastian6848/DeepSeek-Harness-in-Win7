/** Deployment defaults for the Win7 intranet distribution. */
import type { EntryOptions } from '@deepseek-ai/cordis-plugin-loader'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'

const DISABLED = new Set([
  '@deepseek-ai/dsh-tool-web',
  '@deepseek-ai/dsh-web-search-deepseek',
  '@deepseek-ai/dsh-web-deepseek-api',
  '@deepseek-ai/dsh-web-fetch-http',
  '@deepseek-ai/dsh-session-log-deepseek',
  '@deepseek-ai/dsh-session-telemetry-otel',
  '@deepseek-ai/dsh-host-product-telemetry-otel',
  '@deepseek-ai/dsh-client-product-analytics',
  '@deepseek-ai/dsh-deepseek-account',
  '@deepseek-ai/dsh-llm-deepseek-api-key',
  '@deepseek-ai/dsh-llm-deepseek-account',
  '@deepseek-ai/dsh-client-ui-settings-account',
  '@deepseek-ai/dsh-client-ui-account-notifications',
  '@deepseek-ai/dsh-client-ui-settings-web-search',
  '@deepseek-ai/dsh-client-ui-plugin-manager',
  '@deepseek-ai/dsh-tool-plugin-manager',
  '@deepseek-ai/dsh-plugin-manager/tools',
  '@deepseek-ai/dsh-plugin-market',
  '@deepseek-ai/dsh-plugin-market/tools',
  '@deepseek-ai/dsh-mcp-manager',
  '@deepseek-ai/dsh-mcp-client',
  '@deepseek-ai/dsh-deepseek-chat-import',
])

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sanitize(row: EntryOptions): EntryOptions {
  const name = row.name ?? ''
  if (DISABLED.has(name) || name.startsWith('@deepseek-ai/dsh-experimental-plugin-market')) {
    return { ...row, disabled: true }
  }
  const config: unknown = row.config
  if (name === '@deepseek-ai/dsh-agent-default-model' && record(config)
    && config.provider === 'deepseek-official') {
    return { ...row, config: { provider: 'intranet-deepseek', model: 'ds' } }
  }
  if (name === '@deepseek-ai/dsh-client-ui-settings-models' && record(config)) {
    return { ...row, config: { ...config, credentialOnboarding: false, intranetDefaults: true } }
  }
  if (name === '@deepseek-ai/dsh-client-ui-settings-models' && config === undefined) {
    return { ...row, config: { credentialOnboarding: false, intranetDefaults: true } }
  }
  if (row.group && Array.isArray(config)) {
    return { ...row, config: config.map(sanitize) }
  }
  if (name === '@deepseek-ai/dsh-agent-preset' && record(config) && Array.isArray(config.plugins)) {
    return { ...row, config: { ...config, plugins: config.plugins.map(sanitize) } }
  }
  return row
}

/**
 * Disable network capabilities in both host rows and nested agent presets.
 * @param entries - Fully composed rows, including user overrides.
 * @returns Final patches; the original rows remain unchanged.
 */
export function intranetProfilePatches(entries: readonly EntryOptions[]): PatchOptions[] {
  return entries.flatMap((row) => {
    const safe = sanitize(row)
    if (safe === row) return []
    return [{ id: row.id,
      ...(safe.disabled !== row.disabled ? { disabled: safe.disabled } : {}),
      ...(safe.config !== row.config ? { config: safe.config } : {}),
    }]
  })
}
