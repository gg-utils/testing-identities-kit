/**
 * @fileoverview Public barrel for `@gg-utils/testing-identities-kit` that re-exports argv construction,
 * workflow contracts, command previews, Ink and OpenTUI shells, stdout JSON parsing, and `npx tsx`
 * spawn helpers used by testing-identities operator UIs.
 *
 * This file owns the default `"."` export surface declared in `package.json`; subpath exports remain
 * the narrow-import option while this barrel exposes the full curated kit to orchestration scripts.
 * Flow: consumer `import ... from "@gg-utils/testing-identities-kit"` -> named re-exports below -> concrete
 * implementations under `packages/testing-identities-kit/src/`.
 *
 * @example
 * ```typescript
 * import { TestingIdentitiesKit_buildArgv } from "@gg-utils/testing-identities-kit";
 *
 * TestingIdentitiesKit_buildArgv({
 *   workflow: "allocate",
 *   purpose: "e2e",
 *   runId: "run-1",
 * });
 * ```
 *
 * @testing Node test runner (tsx): npm run testing-identities-kit:test
 * @testing CLI: npm run testing-identities-kit:type-check
 *
 * @see testing-identities.config.ts - Root workflow catalog, form bundles, and interactive-menu wiring that pairs with kit contracts and shells re-exported from this barrel.
 * @see scripts/checks/testing-identities-package-boundary.ts - Import-boundary checker that validates `@gg-utils/testing-identities-kit` usage against the export map this barrel implements.
 * @see packages/testing-identities-kit/src/contracts.ts - Discriminated workflow argv types and field bundles re-exported here for UI adapters and script harnesses.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
export * from "./build-argv.js";
export * from "./contracts.js";
export * from "./form-to-argv.js";
export * from "./format-command.js";
export * from "./format-preview.js";
export * from "./ink-task.js";
export * from "./ink-app.js";
export * from "./interactive-menu.js";
export * from "./opentui-app.js";
export * from "./parse-stdout-json.js";
export * from "./spawn-npx-tsx.js";
export * from "./workflows.js";
//# sourceMappingURL=index.js.map