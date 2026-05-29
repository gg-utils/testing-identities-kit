/**
 * @fileoverview Verifies the testing-identities text interactive menu loop, invalid-choice handling,
 * and npm-script dispatch through injected session and runner hooks.
 *
 * This file owns `node:test` regression coverage for `TestingIdentitiesKit_runInteractiveMenu` using a
 * `FakeSession` that sequences operator choices and yes/no answers without a TTY.
 * Flow: configure menu fixture -> await menu runner with stubbed `runNpmScript` -> assert emitted lines and captured npm script invocations.
 *
 * @testing Node unit: npm run testing-identities-kit:test
 * @testing Node unit (tsx --test): npm run test --prefix packages/testing-identities-kit -- src/interactive-menu.unit.test.ts
 *
 * @see packages/testing-identities-kit/src/interactive-menu.ts - Menu runner and session contract under test whose read-eval loop, validation messaging, and script delegation these FakeSession-backed assertions lock down.
 * @see identity-workflows/ui/cli-interactive/main.ts - Root TTY adapter that imports `TestingIdentitiesKit_runInteractiveMenu` with production session wiring; behavior exercised here should stay aligned with that operator entrypoint.
 * @see testing-identities.config.ts - Root-owned `TestingIdentitiesKit_InteractiveMenuDefinition` labels and npm script aliases paired with the interactive CLI so fixture menu items mirror real workflow keys.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TestingIdentitiesKit_runInteractiveMenu,
  type TestingIdentitiesKit_InteractiveMenuDefinition,
  type TestingIdentitiesKit_InteractiveSession,
  type TestingIdentitiesKit_RunInteractiveNpmScriptOptions,
} from "./interactive-menu.js";

/** Fixture `TestingIdentitiesKit_InteractiveMenuDefinition` covering allocate/ensure workflow keys used by assertions below. */
const TEST_MENU: TestingIdentitiesKit_InteractiveMenuDefinition = {
  headerLabel: "IDENTITIES",
  headerTitle: "Identity Workflows",
  menuTitle: "Main Menu",
  menuSubtitle: "Select an action",
  returnPromptLabel: "Return to menu",
  exitLabel: "Exit",
  exitDescription: "Return to shell",
  exitMessage: "Goodbye!",
  items: [
    {
      label: "Allocate identity",
      description: "Create a test identity",
      panelTitle: "Allocate Identity",
      panelSubtitle: "Creating identity",
      scriptName: "identity:allocate",
      successMessage: "Allocation completed",
    },
    {
      label: "Ensure identity",
      description: "Ensure account exists",
      panelTitle: "Ensure Identity",
      panelSubtitle: "Ensuring account",
      scriptName: "identity:ensure",
      successMessage: "Ensure completed",
    },
  ],
};

/**
 * Deterministic `TestingIdentitiesKit_InteractiveSession` test double that records printed lines and
 * dequeues scripted `promptReadLine` / `promptYesNo` answers.
 */
class FakeSession implements TestingIdentitiesKit_InteractiveSession {
  readonly lines: string[] = [];
  private readonly choices: string[];
  private readonly yesNoAnswers: boolean[];

  constructor(options: { choices: string[]; yesNoAnswers: boolean[] }) {
    this.choices = [...options.choices];
    this.yesNoAnswers = [...options.yesNoAnswers];
  }

  printHeader(label: string, title: string): void {
    this.lines.push(`${label}:${title}`);
  }

  printPanelTitle(title: string, subtitle: string): void {
    this.lines.push(`${title}:${subtitle}`);
  }

  printMenuItem(key: string, label: string, description: string): void {
    this.lines.push(`${key}:${label}:${description}`);
  }

  writeLine(line: string): void {
    this.lines.push(line);
  }

  async promptReadLine(): Promise<string> {
    return this.choices.shift() ?? "";
  }

  async promptYesNo(): Promise<boolean> {
    return this.yesNoAnswers.shift() ?? false;
  }

  printError(message: string): void {
    this.lines.push(`error:${message}`);
  }

  printSuccess(message: string): void {
    this.lines.push(`success:${message}`);
  }
}

describe("TestingIdentitiesKit_runInteractiveMenu", () => {
  it("runs selected configured action and exits when operator declines return", async () => {
    const session = new FakeSession({ choices: ["2"], yesNoAnswers: [false] });
    const runs: TestingIdentitiesKit_RunInteractiveNpmScriptOptions[] = [];

    await TestingIdentitiesKit_runInteractiveMenu({
      cwd: "/workspace",
      menu: TEST_MENU,
      runNpmScript: async (options) => {
        runs.push(options);
      },
      session,
    });

    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.cwd, "/workspace");
    assert.equal(runs[0]?.scriptName, "identity:ensure");
    assert.ok(session.lines.includes("success:Ensure completed"));
  });

  it("prints errors for invalid choices before accepting exit", async () => {
    const session = new FakeSession({ choices: ["9", "3"], yesNoAnswers: [] });

    await TestingIdentitiesKit_runInteractiveMenu({
      cwd: "/workspace",
      menu: TEST_MENU,
      runNpmScript: async () => {},
      session,
    });

    assert.ok(session.lines.includes("error:Invalid choice: 9"));
    assert.ok(session.lines.includes("success:Goodbye!"));
  });
});
