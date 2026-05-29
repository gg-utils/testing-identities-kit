import type { TestingIdentitiesKit_UiConfig } from "./contracts.js";
/**
 * Ink renderer for the testing-identities workflow wizard, previews, and spawned runs.
 *
 * @remarks
 * I/O: launches child processes through the shared Ink task bridge and streams stdout/stderr into UI state.
 */
export declare function TestingIdentitiesKitInkApp({ config, }: {
    config: TestingIdentitiesKit_UiConfig;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ink-app.d.ts.map