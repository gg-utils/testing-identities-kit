/**
 * @fileoverview Verifies formatted command preview lines for testing-identities workflows.
 *
 * This file owns Node test regression coverage for npm and `npx tsx` preview strings derived from
 * workflow definitions, including single-alias workflows and strict alternate npm script selection.
 *
 * Flow: fixture workflow definitions -> TestingIdentitiesKit_formatCommandPreviewLines -> assert rendered npm and tsx hints.
 *
 * @testing Node unit: npm run testing-identities-kit:test
 * @testing Node unit (tsx --test): npm run test --prefix packages/testing-identities-kit -- src/format-preview.unit.test.ts
 *
 * @see packages/testing-identities-kit/src/format-preview.ts - Preview formatter under test that maps argv inputs and workflow metadata into human-readable command lines.
 * @see packages/testing-identities-kit/src/contracts.ts - Shared workflow-definition contract types used by the in-file fixture catalogs these assertions exercise.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TestingIdentitiesKit_WorkflowDefinition } from "./contracts.js";
import { TestingIdentitiesKit_formatCommandPreviewLines } from "./format-preview.js";

const TEST_WORKFLOWS: readonly TestingIdentitiesKit_WorkflowDefinition[] = [
  {
    id: "allocate",
    label: "Allocate",
    npmScriptName: "identity:allocate",
    scriptPathUnderRepo: "tooling/identity/allocate.ts",
  },
  {
    alternateNpmScripts: [
      { label: "Warn", npmScriptName: "identity:hygiene:warn", strict: false },
      {
        label: "Strict",
        npmScriptName: "identity:hygiene:strict",
        strict: true,
      },
    ],
    alternateNpmScriptsNote: "Configured npm aliases omit machine JSON output.",
    id: "fixtureHygiene",
    label: "Hygiene",
    npmScriptName: null,
    scriptPathUnderRepo: "tooling/identity/hygiene.ts",
  },
];

describe("TestingIdentitiesKit_formatCommandPreviewLines", () => {
  it("renders configured npm and tsx lines for single-alias workflows", () => {
    const lines = TestingIdentitiesKit_formatCommandPreviewLines({
      input: { workflow: "allocate", purpose: "demo run" },
      redacted: true,
      workflows: TEST_WORKFLOWS,
    });

    assert.match(
      lines.join("\n"),
      /npm run identity:allocate -- --purpose 'demo run'/,
    );
    assert.match(lines.join("\n"), /npx tsx tooling\/identity\/allocate\.ts/);
  });

  it("selects the strict alternate npm hint from config", () => {
    const lines = TestingIdentitiesKit_formatCommandPreviewLines({
      input: { workflow: "fixtureHygiene", strict: true },
      redacted: true,
      workflows: TEST_WORKFLOWS,
    });

    assert.equal(lines[0], "Configured npm aliases omit machine JSON output.");
    assert.equal(lines[1], "npm run identity:hygiene:strict");
    assert.equal(lines.includes("npm run identity:hygiene:warn"), false);
    assert.match(lines.join("\n"), /--json --strict/);
  });
});
