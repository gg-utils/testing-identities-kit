/**
 * @fileoverview Owns the reusable testing-identities text menu loop, session contract, and npm-script dispatch hooks used by root CLI adapters.
 *
 * This module renders a numbered menu from `TestingIdentitiesKit_InteractiveMenuDefinition`, validates operator input, delegates selected actions through an injected `runNpmScript` callback, and loops until exit or when the operator declines the return prompt.
 * Flow: print menu -> read choice -> exit on last index -> dispatch npm script via callback -> optional return-to-menu prompt.
 *
 * @testing Node test unit: cd packages/testing-identities-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/interactive-menu.unit.test.ts
 * @testing CLI manual: run `npx tsx identity-workflows/ui/cli-interactive/main.ts` from the repository root in a TTY and confirm menu labels plus npm-script delegation match `testing-identities.config.ts`.
 *
 * @see packages/testing-identities-kit/src/interactive-menu.unit.test.ts - Node `tsx --test` suite that asserts invalid choices, exit handling, success paths, and the read-eval loop contract owned by this menu runner.
 * @see identity-workflows/ui/cli-interactive/main.ts - Root interactive CLI adapter that imports `TestingIdentitiesKit_runInteractiveMenu`, injects `TESTING_IDENTITIES_CONFIG` cwd and menu definition, and wires npm-script execution into the session surface.
 * @see testing-identities.config.ts - Root-owned `TestingIdentitiesKit_InteractiveMenuDefinition` wiring (labels, workflow items, npm script names) paired with the adapter that calls into this module.
 * @see packages/testing-identities-kit/src/index.ts - Package barrel re-exporting this surface as `@gg-utils/testing-identities-kit` and the `./interactive-menu` subpath export alongside other kit helpers.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** Minimal terminal session surface required by the reusable interactive menu. */
export interface TestingIdentitiesKit_InteractiveSession {
    printHeader: (label: string, title: string) => void;
    printPanelTitle: (title: string, subtitle: string) => void;
    printMenuItem: (key: string, label: string, description: string) => void;
    writeLine: (line: string) => void;
    promptReadLine: (prompt: string) => Promise<string>;
    promptYesNo: (label: string, defaultAnswer: string) => Promise<boolean>;
    printError: (message: string) => void;
    printSuccess: (message: string) => void;
}
/** One runnable item in a configured testing-identities text menu. */
export interface TestingIdentitiesKit_InteractiveMenuItem {
    label: string;
    description: string;
    panelTitle: string;
    panelSubtitle: string;
    scriptName: string;
    successMessage: string;
}
/** Configured labels and actions for the reusable text menu. */
export interface TestingIdentitiesKit_InteractiveMenuDefinition {
    headerLabel: string;
    headerTitle: string;
    menuTitle: string;
    menuSubtitle: string;
    returnPromptLabel: string;
    exitLabel: string;
    exitDescription: string;
    exitMessage: string;
    items: readonly TestingIdentitiesKit_InteractiveMenuItem[];
}
/** Callback used by root adapters to execute npm scripts without package-owned subprocess policy. */
export interface TestingIdentitiesKit_RunInteractiveNpmScriptOptions {
    cwd: string;
    scriptName: string;
    session: TestingIdentitiesKit_InteractiveSession;
}
/** Drives the configured testing-identities text menu until exit or operator stop. */
export declare function TestingIdentitiesKit_runInteractiveMenu(options: {
    cwd: string;
    menu: TestingIdentitiesKit_InteractiveMenuDefinition;
    runNpmScript: (runOptions: TestingIdentitiesKit_RunInteractiveNpmScriptOptions) => Promise<void>;
    session: TestingIdentitiesKit_InteractiveSession;
}): Promise<void>;
//# sourceMappingURL=interactive-menu.d.ts.map