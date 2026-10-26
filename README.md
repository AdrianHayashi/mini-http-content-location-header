# mini-http-content-location-header

Parses and normalizes the HTTP `Content-Location` header into an absolute URL resolved against a base URL. Returns the resolved URL string, whether the original value was already absolute, and whether it was the empty string.

```js
import { resolveContentLocation } from "mini-http-content-location-header";

const result = resolveContentLocation("/items/42", "https://api.example.net/v1/items");
// => { url: "https://api.example.net/items/42", absolute: false, empty: false }
```

## Why this exists

`Content-Location` is sent as a header value and is frequently relative. Comparing it to stored URLs, or using it for cache keys, only makes sense once it is resolved to an absolute URL against the request that carried it. The resolution itself is the entire point: delegating to the platform's WHATWG `URL` constructor means we inherit RFC 3986 reference resolution exactly as implemented by the runtime, including dot-segment removal and scheme-relative inheritance, without reimplementing a parser.

The trade-off is that we do not attempt to canonicalise beyond resolution. Two strings that differ only in trivially equivalent ways (e.g., case in the host, default ports, trailing dots) may produce different outputs, because `URL` canonicalises some but not all of these. If you need stricter canonicalisation, normalise before calling.

## The edge you will hit

A relative `Content-Location` with no leading slash — `"42"` against `https://api.example.net/v1/items` — resolves to `https://api.example.net/v1/42`, not `https://api.example.net/42`. This is correct per RFC 3986 §5.3 but surprising if you expected the header value to be treated as site-root-relative.

An empty `Content-Location` header value resolves to the base URL itself. This is distinct from the header being absent and is flagged via the `empty` field so callers can distinguish them.

The base URL must be absolute. Passing a relative base throws `TypeError`; resolving a header against a relative base is not a defined operation for HTTP and producing a result of unknown base would defeat the purpose of normalisation.

## Exports

- `resolveContentLocation(contentLocation: string, baseUrl: string): { url: string, absolute: boolean, empty: boolean }`
- `isAbsoluteUrl(url: string): boolean`
