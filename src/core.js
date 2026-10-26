/**
 * Utilities for parsing and normalizing the HTTP Content-Location header.
 *
 * The Content-Location header (RFC 7231 §3.1.3.2) points at the URL of the
 * representation served by a response. When that value is relative, it must
 * be resolved against the request URL to be meaningful. The WHATWG URL
 * standard already handles this resolution correctly and is part of Node's
 * standard library, so there is no reason to reimplement it.
 */

/**
 * Determine whether a string is an absolute URL, using the same definition
 * the WHATWG URL constructor uses: a URL is absolute iff its `protocol`
 * component is non-empty after parsing.
 *
 * We do not use `canParse` here because we need the parsed object to inspect
 * the protocol, not merely a boolean. Reusing the constructor for both
 * validation and inspection avoids a double parse.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isAbsoluteUrl(url) {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol !== "";
  } catch {
    return false;
  }
}

/**
 * Resolve a Content-Location header value against a base URL and return the
 * resulting absolute URL string.
 *
 * RFC 7231 §3.1.3.2 says Content-Location may be relative; the base is the
 * request URL. This function exists so callers don't have to repeat the
 * validity checks that the header value and the base URL are both well-formed
 * absolute or resolvable URLs.
 *
 * The only special form we recognise is the empty string: per RFC 3986 §5.3,
 * an empty path component resolves to the base path. This is distinct from
 * sending no header at all and is reported as "empty" so callers can tell them
 * apart. An absent header has no value to pass to this function in the first
 * place.
 *
 * @param {string} contentLocation - raw header value
 * @param {string} baseUrl - the URL to resolve against
 * @returns {{ url: string, absolute: boolean, empty: boolean }}
 *   - `url`: the resolved absolute URL string
 *   - `absolute`: true iff the raw header value was already an absolute URL
 *   - `empty`: true iff the raw header value was the empty string
 * @throws {TypeError} if `contentLocation` or `baseUrl` is not a string, or
 *   if `baseUrl` is not an absolute URL, or if `contentLocation` cannot be
 *   parsed relative to `baseUrl`.
 */
export function resolveContentLocation(contentLocation, baseUrl) {
  if (typeof contentLocation !== "string") {
    throw new TypeError("contentLocation must be a string");
  }
  if (typeof baseUrl !== "string") {
    throw new TypeError("baseUrl must be a string");
  }

  // Reject a relative base. Resolving against a relative base is not a
  // defined operation for HTTP headers and would produce a result whose
  // own base is unknown, which defeats the point of this library.
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new TypeError("baseUrl must be a valid absolute URL");
  }
  if (base.protocol === "") {
    throw new TypeError("baseUrl must be a valid absolute URL");
  }

  const empty = contentLocation.length === 0;
  const absolute = isAbsoluteUrl(contentLocation);

  // The WHATWG URL constructor performs the RFC 3986 reference resolution
  // algorithm when given a second argument. It throws a TypeError on
  // failure (e.g., for a value with a scheme but no host); we surface that
  // as-is so callers can distinguish bad input from bad resolution.
  const resolved = new URL(contentLocation, baseUrl);

  return {
    url: resolved.href,
    absolute,
    empty,
  };
}
