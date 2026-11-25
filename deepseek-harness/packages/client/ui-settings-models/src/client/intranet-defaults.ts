/** Defaults and URL normalization for a user-declared intranet model. */

/**
 * Prepare an editable draft without querying a model service.
 * @param taken - Existing route ids, which must not be overwritten.
 * @param protocols - Protocols supplied by the installed adapter.
 * @returns Local form defaults; the endpoint remains empty.
 */
export function customProviderDefaults(taken: readonly string[], protocols: readonly string[]) {
  return {
    route: taken.includes('intranet-deepseek') ? '' : 'intranet-deepseek',
    protocol: protocols.includes('openai-completions') ? 'openai-completions' : protocols[0] ?? '',
    models: [{ id: 'ds' }],
  }
}

/**
 * Convert a root or full completion address into the SDK's API base.
 * @param input - Address entered by the user.
 * @param protocol - Selected wire protocol.
 * @returns Validated API root; empty input remains empty while editing.
 */
export function normalizeCompatibleBaseURL(input: string, protocol: string): string {
  const text = input.trim()
  if (text === '') return ''
  const url = new URL(text)
  if (!['http:', 'https:'].includes(url.protocol) || url.username !== '' || url.password !== ''
    || url.search !== '' || url.hash !== '' || /\s/u.test(text)) {
    throw new Error('Invalid API base URL')
  }
  let path = url.pathname.replace(/\/+$/u, '')
  if (protocol === 'openai-completions') {
    const completeEndpoint = path.endsWith('/chat/completions')
    path = path.replace(/\/chat\/completions$/u, '')
    if (path === '' && !completeEndpoint) path = '/v1'
  }
  return `${url.origin}${path}`
}
