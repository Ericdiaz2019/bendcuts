/**
 * Validate a post-auth `next` redirect target.
 *
 * A bare `startsWith('/')` check is NOT enough: protocol-relative URLs like
 * `//evil.com` and backslash variants like `/\evil.com` also start with `/` and
 * browsers treat them as off-origin redirects. Only accept a same-origin absolute
 * path; anything else falls back.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = '/user/projects',
): string {
  if (!next || typeof next !== 'string') return fallback
  if (!next.startsWith('/')) return fallback
  // Reject protocol-relative ("//host") and backslash tricks ("/\\host", "/\/host").
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
