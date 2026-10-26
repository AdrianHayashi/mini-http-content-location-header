import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveContentLocation, isAbsoluteUrl } from "../src/core.js";

const BASE = "https://api.example.net/v1/items";

// --- isAbsoluteUrl ---------------------------------------------------------

test("isAbsoluteUrl returns true for http URLs", () => {
  assert.equal(isAbsoluteUrl("http://foo.example.net/"), true);
});

test("isAbsoluteUrl returns true for https URLs", () => {
  assert.equal(isAbsoluteUrl("https://foo.example.net/x"), true);
});

test("isAbsoluteUrl returns false for a relative path", () => {
  assert.equal(isAbsoluteUrl("/items/42"), false);
});

test("isAbsoluteUrl returns false for a scheme-relative URL", () => {
  // "//host/path" has no scheme, so URL parses it as relative.
  assert.equal(isAbsoluteUrl("//api.example.net/v1/items/42"), false);
});

test("isAbsoluteUrl returns false for unparseable input", () => {
  assert.equal(isAbsoluteUrl("http://[broken"), false);
});

test("isAbsoluteUrl returns false for non-strings", () => {
  assert.equal(isAbsoluteUrl(undefined), false);
  assert.equal(isAbsoluteUrl(123), false);
});

test("isAbsoluteUrl returns false for empty string", () => {
  assert.equal(isAbsoluteUrl(""), false);
});

// --- resolveContentLocation: happy path ------------------------------------

test("relative path is resolved against the base URL", () => {
  const result = resolveContentLocation("/items/42", BASE);
  assert.equal(result.url, "https://api.example.net/items/42");
});

test("same-origin relative path with no leading slash resolves under the base path", () => {
  // "42" resolves relative to the base's path "/v1/items", so it becomes
  // "/v1/42". This is standard RFC 3986 reference resolution and the most
  // commonly missed edge case.
  const result = resolveContentLocation("42", BASE);
  assert.equal(result.url, "https://api.example.net/v1/42");
});

test("scheme-relative URL inherits the scheme from the base", () => {
  const result = resolveContentLocation("//cdn.example.net/assets/x.json", BASE);
  assert.equal(result.url, "https://cdn.example.net/assets/x.json");
});

test("already-absolute URL is returned unchanged", () => {
  const abs = "https://other.example.org/path/to/thing";
  const result = resolveContentLocation(abs, BASE);
  assert.equal(result.url, abs);
});

test("result reports the header value was already absolute", () => {
  const abs = "https://other.example.org/path/to/thing";
  const result = resolveContentLocation(abs, BASE);
  assert.equal(result.absolute, true);
  assert.equal(result.empty, false);
});

test("result reports relative header values as not absolute", () => {
  const result = resolveContentLocation("/items/42", BASE);
  assert.equal(result.absolute, false);
  assert.equal(result.empty, false);
});

test("trailing-dot-segments in the relative path are resolved", () => {
  const result = resolveContentLocation("sub/../42", BASE);
  assert.equal(result.url, "https://api.example.net/v1/42");
});

// --- resolveContentLocation: empty header ----------------------------------

test("empty Content-Location resolves to the base URL and is flagged empty", () => {
  const result = resolveContentLocation("", BASE);
  assert.equal(result.url, BASE);
  assert.equal(result.empty, true);
  assert.equal(result.absolute, false);
});

// --- resolveContentLocation: error cases -----------------------------------

test("non-string contentLocation throws TypeError", () => {
  assert.throws(() => resolveContentLocation(undefined, BASE), TypeError);
  assert.throws(() => resolveContentLocation(123, BASE), TypeError);
});

test("non-string baseUrl throws TypeError", () => {
  assert.throws(() => resolveContentLocation("/x", undefined), TypeError);
});

test("relative baseUrl throws TypeError", () => {
  // A relative base is not a defined resolution context for this library.
  assert.throws(() => resolveContentLocation("/x", "/path/only"), TypeError);
});

test("unparseable baseUrl throws TypeError", () => {
  assert.throws(() => resolveContentLocation("/x", "http://[broken"), TypeError);
});

test("contentLocation that fails to resolve against a valid base throws TypeError", () => {
  // A scheme with no host cannot be resolved against an http base.
  assert.throws(() => resolveContentLocation("http://", BASE), TypeError);
});
