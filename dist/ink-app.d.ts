/**
 * @fileoverview Renders the package-owned Ink workflow wizard for configured testing identities.
 *
 * Reusable Ink state, keyboard handling, command previews, child-process streaming, and result
 * parsing live here. Host workspaces inject repo roots, workflow paths, npm aliases, and labels
 * through `TestingIdentitiesKit_UiConfig`.
 *
 * @testing Node unit: npm run testing-identities-kit:test
 * @see packages/testing-identities-kit/src/format-preview.ts - Supplies command preview strings.
 * @see packages/testing-identities-kit/src/ink-task.ts - Streams child-process output into Ink.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import React from "react";
import type { TestingIdentitiesKit_UiConfig } from "./contracts.js";
/**
 * Ink renderer for the testing-identities workflow wizard, previews, and spawned runs.
 *
 * @remarks
 * I/O: launches child processes through the shared Ink task bridge and streams stdout/stderr into UI state.
 */
export declare function TestingIdentitiesKitInkApp({ config, }: {
    config: TestingIdentitiesKit_UiConfig;
}): React.JSX.Element;
//# sourceMappingURL=ink-app.d.ts.map