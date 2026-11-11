import type { TestingIdentitiesKit_UiConfig } from "./contracts.js";
/**
 * OpenTUI renderer for testing-identities workflow selection, previews, and spawned runs.
 *
 * @remarks
 * I/O: spawns `npx tsx` workflows via `TestingIdentitiesKit_spawnNpxTsx` and tracks cancellation through refs.
 */
export declare function TestingIdentitiesKitOpenTuiApp(props: {
    config: TestingIdentitiesKit_UiConfig;
}): import("react").JSX.Element;
//# sourceMappingURL=opentui-app.d.ts.map