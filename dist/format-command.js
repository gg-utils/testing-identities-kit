/**
 * @fileoverview Pure shell-style argv quoting for displaying testing-identities CLI commands in UIs
 * and logs without executing them.
 *
 * This file owns `TestingIdentitiesKit_formatCommandLine`, which joins a base command with quoted
 * argv tokens using POSIX-style single-quote escaping for characters outside a safe unquoted set.
 * Flow: token -> optional quoting/escaping -> space-joined preview line.
 *
 * @example
 * ```typescript
 * import { TestingIdentitiesKit_formatCommandLine } from "@gg-utils/testing-identities-kit";
 *
 * TestingIdentitiesKit_formatCommandLine("npx", [
 *   "tsx",
 *   "tooling/identity/allocate.ts",
 *   "--purpose",
 *   "demo run",
 * ]);
 * ```
 *
 * @testing Node test runner (node:test via tsx): cd packages/testing-identities-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/format-preview.unit.test.ts
 *
 * @see packages/testing-identities-kit/src/format-preview.ts - Command preview builder that calls this formatter to render npm and npx argv lines shown in testing-identities UIs.
 * @see packages/testing-identities-kit/src/ink-app.tsx - Ink terminal UI that composes workflow command previews using this formatter for operator copy-and-run hints.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - Canonical file-overview tag order and audit metadata referenced by repo scanners for TypeScript headers.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** Quotes one argv token for shell-like preview strings. */
function shellQuoteArg(arg) {
    if (/^[\w@%+=:,./-]+$/.test(arg)) {
        return arg;
    }
    const escaped = arg.replace(/'/g, "'\\''");
    return `'${escaped}'`;
}
/**
 * Formats one command plus argv into a shell-like display line.
 *
 * @remarks
 * PURITY: deterministic string transform with no I/O. Intended for previews in terminals and docs;
 * callers must not treat the result as a validated shell injection barrier when feeding real shells.
 *
 * @example
 * ```typescript
 * TestingIdentitiesKit_formatCommandLine("npm", ["run", "identity:allocate", "--", "--purpose", "x"]);
 * ```
 */
export function TestingIdentitiesKit_formatCommandLine(command, argv) {
    return [command, ...argv].map(shellQuoteArg).join(" ");
}
//# sourceMappingURL=format-command.js.map