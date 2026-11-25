/** Native-shell network operations require explicit deployment opt-in. */

/**
 * Read the exact opt-in used by updates and account onboarding.
 * @param environment - Process environment, supplied explicitly by tests.
 * @returns True only for DSH_ALLOW_EXTERNAL_NETWORK=1.
 */
export function desktopExternalNetworkAllowed(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.DSH_ALLOW_EXTERNAL_NETWORK === '1'
}
