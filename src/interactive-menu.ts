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

/** Prints the configured menu and stable exit item. */
function TestingIdentitiesKit_printInteractiveMenu(options: {
  session: TestingIdentitiesKit_InteractiveSession;
  menu: TestingIdentitiesKit_InteractiveMenuDefinition;
}): void {
  options.session.printHeader(options.menu.headerLabel, options.menu.headerTitle);
  options.session.printPanelTitle(options.menu.menuTitle, options.menu.menuSubtitle);
  options.menu.items.forEach((item, index) => {
    options.session.printMenuItem(String(index + 1), item.label, item.description);
  });
  options.session.printMenuItem(
    String(options.menu.items.length + 1),
    options.menu.exitLabel,
    options.menu.exitDescription,
  );
  options.session.writeLine("");
}

/** Executes one configured menu action through the root-provided npm runner. */
async function TestingIdentitiesKit_runInteractiveAction(options: {
  cwd: string;
  item: TestingIdentitiesKit_InteractiveMenuItem;
  runNpmScript: (
    runOptions: TestingIdentitiesKit_RunInteractiveNpmScriptOptions,
  ) => Promise<void>;
  session: TestingIdentitiesKit_InteractiveSession;
}): Promise<void> {
  options.session.printPanelTitle(options.item.panelTitle, options.item.panelSubtitle);
  await options.runNpmScript({
    cwd: options.cwd,
    scriptName: options.item.scriptName,
    session: options.session,
  });
  options.session.printSuccess(options.item.successMessage);
}

/** Drives the configured testing-identities text menu until exit or operator stop. */
export async function TestingIdentitiesKit_runInteractiveMenu(options: {
  cwd: string;
  menu: TestingIdentitiesKit_InteractiveMenuDefinition;
  runNpmScript: (
    runOptions: TestingIdentitiesKit_RunInteractiveNpmScriptOptions,
  ) => Promise<void>;
  session: TestingIdentitiesKit_InteractiveSession;
}): Promise<void> {
  const exitChoice = String(options.menu.items.length + 1);

  for (;;) {
    TestingIdentitiesKit_printInteractiveMenu({
      menu: options.menu,
      session: options.session,
    });

    const choice = await options.session.promptReadLine(
      `Enter choice [1-${exitChoice}]: `,
    );

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
