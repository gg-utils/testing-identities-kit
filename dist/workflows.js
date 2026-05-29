/**
 * @fileoverview Resolves configured testing-identities workflow metadata from a caller-supplied
 * catalog by workflow id for argv builders, preview formatters, and Ink/OpenTUI shells.
 *
 * This file owns `TestingIdentitiesKit_findWorkflow` plus type-only re-exports of
 * `TestingIdentitiesKit_WorkflowDefinition` and `TestingIdentitiesKit_WorkflowId` from the contracts
 * module for `@gg-utils/testing-identities-kit/workflows` consumers.
 * Flow: workflow id plus catalog array -> matching definition or deterministic lookup error.
 *
 * @testing Jest unit: cd packages/testing-identities-kit && npm run test -- src/format-preview.unit.test.ts
 * @testing CLI: npm run file-overview-standards:target-brief -- --file packages/testing-identities-kit/src/workflows.ts
 *
 * @see packages/testing-identities-kit/src/contracts.ts - Canonical workflow id and workflow-definition records this module re-exports and that configured catalogs must include before lookup can succeed.
 * @see packages/testing-identities-kit/src/format-preview.ts - Command preview helper that calls `TestingIdentitiesKit_findWorkflow` to resolve script paths and npm script metadata for the active workflow id.
 * @see packages/testing-identities-kit/src/build-argv.ts - Argv builder that uses `TestingIdentitiesKit_findWorkflow` to anchor `scriptPathUnderRepo` before translating form fields into spawn flags.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/**
 * Resolves a workflow definition from a configured catalog by id.
 *
 * @remarks
 * PURITY: synchronous array scan with no I/O.
 *
 * @throws Error when no catalog entry matches `options.id`.
 */
export function TestingIdentitiesKit_findWorkflow(options) {
    const found = options.workflows.find((workflow) => workflow.id === options.id);
    if (!found) {
        throw new Error(`Unknown workflow: ${options.id}`);
    }
    return found;
}
//# sourceMappingURL=workflows.js.map