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
export {};
//# sourceMappingURL=contracts.js.map