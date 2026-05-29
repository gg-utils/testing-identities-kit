/**
 * @fileoverview Extracts and parses the last balanced top-level JSON object from CLI stdout for
 * testing-identities kit runners.
 *
 * This file owns reverse scanning for `{` anchors, brace-balanced `{ ... }` slicing with string and
 * escape awareness, and a typed ok/error envelope around `JSON.parse` for noisy script output.
 * Flow: trim stdout -> scan end to start for `{` -> extract balanced object slice -> JSON.parse.
 *
 * @example
 * ```typescript
 * import { TestingIdentitiesKit_parseLastJsonObject } from "@gg-utils/testing-identities-kit/parse-stdout-json";
 *
 * const result = TestingIdentitiesKit_parseLastJsonObject('logs...\n{"ok":true,"runId":"r1"}\n');
 * if (result.ok) {
 *   console.log(result.value);
 * }
 * ```
 *
 * @testing Node unit: npm run testing-identities-kit:test
 *
 * @see packages/testing-identities-kit/src/ink-app.tsx - Ink workflow UI that parses the last JSON object from identity script stdout after mixed log lines.
 * @see packages/testing-identities-kit/src/opentui-app.tsx - OpenTUI runner that applies the same trailing-JSON stdout contract when collecting child-process output.
 * @see packages/testing-identities-kit/src/index.ts - Package barrel that re-exports this parser next to other testing-identities workflow helpers.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

/**
 * Outcome of attempting to read the last JSON object from stdout.
 *
 * @remarks
 * `value` stays `unknown` because each workflow script defines its own JSON payload; callers must
 * narrow or validate before use.
 */
export type TestingIdentitiesKit_ParseStdoutJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/**
 * Returns the balanced `{ ... }` substring starting at `openBraceIndex`, or null if braces never
 * close.
 *
 * @remarks
 * Tracks string literals and backslash escapes so braces inside JSON strings do not change depth.
 * PURITY: read-only scan over `source`.
 *
 * @param source - Full stdout text being scanned.
 * @param openBraceIndex - Index of a `{` that might begin a JSON object.
 */
function TestingIdentitiesKit_extractBalancedObject(
  source: string,
  openBraceIndex: number,
): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (character === "\\") {
        escape = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openBraceIndex, index + 1);
      }
    }
  }

  return null;
}

/**
 * Parses the last top-level `{ ... }` JSON object found in stdout.
 *
 * @remarks
 * Walks the trimmed string from the last character toward the start, treating each `{` as a
 * candidate object start and skipping slices that are not valid JSON. On failure, prefers the last
 * `JSON.parse` error message when any slice was attempted. PURITY: pure string parsing only.
 *
 * @param stdout - Raw stdout that may include logs or banners before the final JSON object.
 *
 * @example
 * ```typescript
 * TestingIdentitiesKit_parseLastJsonObject('ignored\n{"a":1}\n');
 * ```
 */
export function TestingIdentitiesKit_parseLastJsonObject(
  stdout: string,
): TestingIdentitiesKit_ParseStdoutJsonResult {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "stdout is empty" };
  }

  let lastError: string | undefined;

  for (let index = trimmed.length - 1; index >= 0; index -= 1) {
    if (trimmed[index] !== "{") {
      continue;
    }

    const slice = TestingIdentitiesKit_extractBalancedObject(trimmed, index);
    if (!slice) {
      continue;
    }

    try {
      return { ok: true, value: JSON.parse(slice) };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    ok: false,
    error: lastError ?? "no parseable JSON object found in stdout",
  };
}
