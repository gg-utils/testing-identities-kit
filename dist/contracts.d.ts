/**
 * @fileoverview Declares typed contracts for testing-identities automation workflows, argv inputs,
 * aggregated form fields, and UI shell configuration shared across Ink, OpenTUI, and interactive CLIs.
 *
 * This file owns discriminated workflow inputs and workflow metadata consumed when building commands,
 * validating operator forms, and wiring `@gg-utils/testing-identities-kit` shells to repo-local scripts.
 * Flow: workflow id plus form fields to argv and spawn inputs, then to terminal UI surfaces.
 *
 * @example
 * ```typescript
 * import type {
 *   TestingIdentitiesKit_UiConfig,
 *   TestingIdentitiesKit_WorkflowDefinition,
 * } from "@gg-utils/testing-identities-kit/contracts";
 *
 * const workflows: readonly TestingIdentitiesKit_WorkflowDefinition[] = [
 *   {
 *     id: "allocate",
 *     label: "Allocate test user email",
 *     scriptPathUnderRepo: "identity-workflows/allocate-test-user.ts",
 *     npmScriptName: "identity:allocate",
 *   },
 * ];
 *
 * const config: TestingIdentitiesKit_UiConfig = {
 *   repoRoot: "/abs/path/to/consumer-platform",
 *   workflows,
 * };
 * ```
 *
 * @testing Jest unit: cd packages/testing-identities-kit && npm run test -- src/ink-app.unit.test.tsx
 * @testing CLI: npm run file-overview-standards:target-brief -- --file packages/testing-identities-kit/src/contracts.ts
 *
 * @see testing-identities.config.ts - Root catalog that materializes `TestingIdentitiesKit_WorkflowDefinition` rows and `TestingIdentitiesKit_UiConfig` for platform-local script paths and resolved repo roots.
 * @see packages/testing-identities-kit/src/build-argv.ts - Argv builder that switches on `TestingIdentitiesKit_BuildArgvInput` discriminants defined in this contracts module.
 * @see identity-workflows/ui/lib/build-argv.ts - UI adapters that re-export argv helpers and keep type aliases aligned with these contracts for interactive CLIs.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** Discriminant for supported testing-identities automation workflows surfaced in the UIs. */
export type TestingIdentitiesKit_WorkflowId = "allocate" | "ensureAuth" | "ensureApplicant" | "fixtureHygiene";
/** Optional npm-script preview metadata for workflows without one canonical alias. */
export interface TestingIdentitiesKit_AlternateNpmScriptDefinition {
    label: string;
    npmScriptName: string;
    strict?: boolean;
}
/** Metadata describing how a configured workflow appears and which script it launches. */
export interface TestingIdentitiesKit_WorkflowDefinition {
    id: TestingIdentitiesKit_WorkflowId;
    label: string;
    scriptPathUnderRepo: string;
    npmScriptName: string | null;
    alternateNpmScripts?: readonly TestingIdentitiesKit_AlternateNpmScriptDefinition[];
    alternateNpmScriptsNote?: string;
}
/** Input for the `allocate` workflow. */
export interface TestingIdentitiesKit_AllocateInput {
    workflow: "allocate";
    purpose?: string;
    runId?: string;
}
/** Input for the `ensureAuth` workflow. */
export interface TestingIdentitiesKit_EnsureAuthInput {
    workflow: "ensureAuth";
    email: string;
    password?: string;
    userName?: string;
    websiteUrl?: string;
    allowRealEmail: boolean;
}
/** Input for the `ensureApplicant` workflow. */
export interface TestingIdentitiesKit_EnsureApplicantInput {
    workflow: "ensureApplicant";
    email: string;
    actorUserToken?: string;
    source?: string;
    apiUrl?: string;
    password?: string;
    userName?: string;
    allowRealEmail: boolean;
}
/** Input for the `fixtureHygiene` workflow. */
export interface TestingIdentitiesKit_FixtureHygieneInput {
    workflow: "fixtureHygiene";
    strict: boolean;
}
/** Discriminated argv-build input keyed by workflow id for preview and spawn paths. */
export type TestingIdentitiesKit_BuildArgvInput = TestingIdentitiesKit_AllocateInput | TestingIdentitiesKit_EnsureAuthInput | TestingIdentitiesKit_EnsureApplicantInput | TestingIdentitiesKit_FixtureHygieneInput;
/** Aggregated form fields covering all testing-identities workflows. */
export interface TestingIdentitiesKit_FormFields {
    allocatePurpose: string;
    allocateRunId: string;
    ensureEmail: string;
    ensurePassword: string;
    ensureUserName: string;
    ensureWebsiteUrl: string;
    ensureAllowReal: boolean;
    applicantActorToken: string;
    applicantSource: string;
    applicantApiUrl: string;
    applicantPassword: string;
    applicantUserName: string;
    applicantAllowReal: boolean;
    fixtureStrict: boolean;
}
/** Explicit config required by reusable testing-identities terminal shells. */
export interface TestingIdentitiesKit_UiConfig {
    repoRoot: string;
    workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
}
//# sourceMappingURL=contracts.d.ts.map