/** Keyless custom OpenAI gateways still need an SDK credential placeholder. */

/**
 * Supply a placeholder only for an explicitly keyless custom Chat Completions route.
 * @param protocol - Route's explicit wire protocol.
 * @param key - Already resolved credential, if present.
 * @param namesCredential - A configured reference or stored credential must win.
 * @param customRoute - False for catalog providers with their own ambient auth.
 * @returns The real key, the SDK placeholder, or undefined for native discovery.
 */
export function compatibleApiKey(protocol: string | undefined, key: string | undefined,
  namesCredential: boolean, customRoute = true): string | undefined {
  if (key !== undefined) return key
  return customRoute && protocol === 'openai-completions' && !namesCredential ? 'intranet-no-auth' : undefined
}
