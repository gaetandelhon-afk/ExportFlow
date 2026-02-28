/**
 * fetchWithAuth — fetch wrapper with automatic 401 retry.
 *
 * Clerk session tokens expire every ~1 minute. The browser SDK refreshes them
 * silently in background, but there's a brief window where a request can land
 * just as the token expires, causing a false 401.
 *
 * This helper retries once after a short delay to let the token refresh.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  retryDelay = 900
): Promise<Response> {
  const res = await fetch(url, options)

  if (res.status === 401) {
    // Wait for Clerk to refresh the session token in the background
    await new Promise((resolve) => setTimeout(resolve, retryDelay))
    return fetch(url, options)
  }

  return res
}
