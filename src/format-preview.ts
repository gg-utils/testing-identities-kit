/**
 * @fileoverview Builds copy-ready multi-line command previews (configured `npm run` hints when
 * present, then the exact `npx tsx …` line) for testing-identities terminal UIs.
 *
 * This file owns `TestingIdentitiesKit_formatCommandPreviewLines` and the alternate-npm filter that
 * keeps fixture-hygiene strict/warn hints aligned with the operator's selected strictness.
 * Flow: resolve workflow -> build argv (raw or redacted for display) -> optional npm block -> blank
 * separator -> tsx line.
 *
 * @testing Node test runner (node:test via tsx): cd packages/testing-identities-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/format-preview.unit.test.ts
 *
 * @see packages/testing-identities-kit/src/build-argv.ts - Argv builders whose output is wrapped into the npm and npx preview lines composed here, including the redacted-for-display path when previews must omit secret argv material.
 * @see packages/testing-identities-kit/src/format-command.ts - Shell-style argv joiner used for each rendered `npm run` and `npx tsx` preview line.
 * @see packages/testing-identities-kit/src/workflows.ts - Workflow catalog lookup supplying script paths, primary npm script names, and alternate npm aliases consulted while assembling previews.
 * @see packages/testing-identities-kit/src/ink-app.tsx - Ink UI consumer that surfaces these preview strings so operators can copy the intended repo-local command sequence.
 * @see identity-workflows/ui/lib/format-preview.ts - Root env-materialize UI helper that re-exports this kit entry so scripted surfaces share the same preview contract.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import {
  TestingIdentitiesKit_buildArgv,
  TestingIdentitiesKit_buildArgvRedactedForDisplay,
  type TestingIdentitiesKit_BuildArgvInput,
} from "./build-argv.js";
import type {
  TestingIdentitiesKit_AlternateNpmScriptDefinition,
  TestingIdentitiesKit_WorkflowDefinition,
} from "./contracts.js";
import { TestingIdentitiesKit_formatCommandLine } from "./format-command.js";
import { TestingIdentitiesKit_findWorkflow } from "./workflows.js";

/**
 * Keeps configured alternate npm aliases aligned with the active strict-mode input for fixture hygiene.
 *
 * @remarks
 * Entries whose `strict` field is set are shown only when the caller selected matching `strict` on
 * the `fixtureHygiene` workflow; entries without `strict` always remain eligible.
 */
function TestingIdentitiesKit_filterAlternateNpmScripts(options: {
  input: TestingIdentitiesKit_BuildArgvInput;
  scripts: readonly TestingIdentitiesKit_AlternateNpmScriptDefinition[];
}): TestingIdentitiesKit_AlternateNpmScriptDefinition[] {
  return options.scripts.filter((script) => {
    if (script.strict === undefined) {
      return true;
    }
    return (
      options.input.workflow === "fixtureHygiene" &&
      options.input.strict === script.strict
    );
  });
}

/**
 * Returns human-readable preview lines: optional npm block (primary `npm run`, alternate aliases,
 * and optional note), then the exact `npx tsx <workflow-script> …argv` line.
 *
 * @remarks
 * PURITY: deterministic string assembly only; previews are not a shell-injection or parsing safety boundary.
 * USAGE: Pass the same workflow catalog the interactive shell uses so paths and npm aliases match runnable wiring. When `redacted` is true, argv comes from the redacted-for-display builder so secrets stay out of operator-facing copy targets.
 * Ordering: npm content (plus optional leading note) when configured, a blank separator when npm lines precede tsx, then the tsx line; otherwise a single tsx line.
 */
export function TestingIdentitiesKit_formatCommandPreviewLines(options: {
  input: TestingIdentitiesKit_BuildArgvInput;
  redacted: boolean;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
}): string[] {
  const workflow = TestingIdentitiesKit_findWorkflow({
    id: options.input.workflow,
    workflows: options.workflows,
  });
  const argv = options.redacted
    ? TestingIdentitiesKit_buildArgvRedactedForDisplay(options.input)
    : TestingIdentitiesKit_buildArgv(options.input);
  const tsxLine = TestingIdentitiesKit_formatCommandLine("npx", [
    "tsx",
    workflow.scriptPathUnderRepo,
    ...argv,
  ]);

  if (workflow.npmScriptName) {
    const npmLine =
      argv.length > 0
        ? TestingIdentitiesKit_formatCommandLine("npm", [
            "run",
            workflow.npmScriptName,
            "--",
            ...argv,
          ])
        : TestingIdentitiesKit_formatCommandLine("npm", [
            "run",
            workflow.npmScriptName,
          ]);
    return [npmLine, "", tsxLine];
  }

  const alternateNpmScripts = TestingIdentitiesKit_filterAlternateNpmScripts({
    input: options.input,
    scripts: workflow.alternateNpmScripts ?? [],
  });
  if (alternateNpmScripts.length > 0) {
    const alternateLines = alternateNpmScripts.map((script) =>
      TestingIdentitiesKit_formatCommandLine("npm", [
        "run",
        script.npmScriptName,
      ]),
    );
    return workflow.alternateNpmScriptsNote
      ? [workflow.alternateNpmScriptsNote, ...alternateLines, "", tsxLine]
      : [...alternateLines, "", tsxLine];
  }

  return [tsxLine];
}
