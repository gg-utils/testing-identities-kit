/**
 * @fileoverview Builds canonical argv arrays and a redacted argv variant for testing-identities
 * workflow shells that spawn `npx tsx` against repository workflow scripts.
 *
 * This file owns workflow-specific flag wiring, optional empty-string suppression, secret redaction
 * for UI previews, and resolution of absolute script paths from the shared workflow catalog.
 * Flow: discriminated workflow input -> canonical argv -> optional redacted copy for display;
 * `TestingIdentitiesKit_scriptAbsolutePath` joins repo roots with catalog `scriptPathUnderRepo`.
 *
 * @example
 * ```typescript
 * import { TestingIdentitiesKit_buildArgv } from "@gg-utils/testing-identities-kit/build-argv";
 *
 * TestingIdentitiesKit_buildArgv({
 *   workflow: "allocate",
 *   purpose: "e2e",
 *   runId: "run-1",
 * });
 * ```
 *
 * @testing Jest unit: npm run test -- identity-workflows/ui/lib/__tests__/build-argv.unit.test.ts
 *
 * @see identity-workflows/ui/lib/build-argv.ts - Root testing-identities UI re-export that forwards to these kit functions so the Jest suite above exercises the same argv wiring production UIs rely on.
 * @see packages/testing-identities-kit/src/contracts.ts - Discriminated workflow input types and per-workflow fields consumed by the argv builders in this module.
 * @see packages/testing-identities-kit/src/workflows.ts - Workflow catalog lookup supplying `scriptPathUnderRepo` for `TestingIdentitiesKit_scriptAbsolutePath` resolution.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import type { TestingIdentitiesKit_BuildArgvInput, TestingIdentitiesKit_WorkflowDefinition, TestingIdentitiesKit_WorkflowId } from "./contracts.js";
export type { TestingIdentitiesKit_AllocateInput, TestingIdentitiesKit_BuildArgvInput, TestingIdentitiesKit_EnsureApplicantInput, TestingIdentitiesKit_EnsureAuthInput, TestingIdentitiesKit_FixtureHygieneInput, } from "./contracts.js";
/** Builds argv passed to `npx tsx <script> ...`; display callers should redact secrets separately. */
export declare function TestingIdentitiesKit_buildArgv(input: TestingIdentitiesKit_BuildArgvInput): string[];
/** Returns argv with secrets replaced for on-screen previews only. */
export declare function TestingIdentitiesKit_buildArgvRedactedForDisplay(input: TestingIdentitiesKit_BuildArgvInput): string[];
/** Resolves the absolute path to the workflow script under a repository root. */
export declare function TestingIdentitiesKit_scriptAbsolutePath(options: {
    projectRoot: string;
    workflow: TestingIdentitiesKit_WorkflowId;
    workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
}): string;
//# sourceMappingURL=build-argv.d.ts.map