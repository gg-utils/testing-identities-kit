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
/** Prints the configured menu and stable exit item. */
function TestingIdentitiesKit_printInteractiveMenu(options) {
    options.session.printHeader(options.menu.headerLabel, options.menu.headerTitle);
    options.session.printPanelTitle(options.menu.menuTitle, options.menu.menuSubtitle);
    options.menu.items.forEach((item, index) => {
        options.session.printMenuItem(String(index + 1), item.label, item.description);
    });
    options.session.printMenuItem(String(options.menu.items.length + 1), options.menu.exitLabel, options.menu.exitDescription);
    options.session.writeLine("");
}
/** Executes one configured menu action through the root-provided npm runner. */
async function TestingIdentitiesKit_runInteractiveAction(options) {
    options.session.printPanelTitle(options.item.panelTitle, options.item.panelSubtitle);
    await options.runNpmScript({
        cwd: options.cwd,
        scriptName: options.item.scriptName,
        session: options.session,
    });
    options.session.printSuccess(options.item.successMessage);
}
/** Drives the configured testing-identities text menu until exit or operator stop. */
export async function TestingIdentitiesKit_runInteractiveMenu(options) {
    const exitChoice = String(options.menu.items.length + 1);
    for (;;) {
        TestingIdentitiesKit_printInteractiveMenu({
            menu: options.menu,
            session: options.session,
        });
        const choice = await options.session.promptReadLine(`Enter choice [1-${exitChoice}]: `);
        if (choice === exitChoice) {
            options.session.printSuccess(options.menu.exitMessage);
            return;
        }
        if (choice === "") {
            continue;
        }
        const selectedItem = options.menu.items[Number(choice) - 1];
        if (!selectedItem) {
            options.session.printError(`Invalid choice: ${choice}`);
            continue;
        }
        await TestingIdentitiesKit_runInteractiveAction({
            cwd: options.cwd,
            item: selectedItem,
            runNpmScript: options.runNpmScript,
            session: options.session,
        });
        if (!(await options.session.promptYesNo(options.menu.returnPromptLabel, "y"))) {
            return;
        }
    }
}
//# sourceMappingURL=interactive-menu.js.map