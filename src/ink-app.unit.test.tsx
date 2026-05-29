/**
 * @fileoverview Verifies static Ink render output for the testing-identities workflow wizard shell.
 *
 * This file owns `node:test` regression coverage that `TestingIdentitiesKitInkApp` prints the
 * configured title and workflow labels when rendered with `renderToString`.
 * Flow: build fixture `TestingIdentitiesKit_UiConfig` -> render `<TestingIdentitiesKitInkApp />` -> assert string markers.
 *
 * @testing Node.js test runner unit: cd packages/testing-identities-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/ink-app.unit.test.tsx
 *
 * @see packages/testing-identities-kit/src/ink-app.tsx - Ink workflow UI under test whose rendered headings and workflow rows these assertions lock down.
 * @see packages/testing-identities-kit/src/contracts.ts - `TestingIdentitiesKit_UiConfig` contract that shapes the fixture config passed into the component here.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - Repository standard defining the audited file-overview header format used at the top of this module.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderToString } from "ink";
import React from "react";

import type { TestingIdentitiesKit_UiConfig } from "./contracts.js";
import { TestingIdentitiesKitInkApp } from "./ink-app.js";

const TEST_CONFIG: TestingIdentitiesKit_UiConfig = {
  repoRoot: "/workspace",
  workflows: [
    {
      id: "allocate",
      label: "Allocate test user email",
      npmScriptName: "identity:allocate",
      scriptPathUnderRepo: "tooling/identity/allocate.ts",
    },
    {
      id: "ensureAuth",
      label: "Ensure auth account",
      npmScriptName: "identity:ensure-auth",
      scriptPathUnderRepo: "tooling/identity/ensure-auth.ts",
    },
  ],
};

describe("TestingIdentitiesKitInkApp", () => {
  it("renders workflow list", () => {
    const output = renderToString(
      <TestingIdentitiesKitInkApp config={TEST_CONFIG} />,
    );
    assert.match(output, /Testing identities \(Ink\)/);
    assert.match(output, /Allocate test user email/);
  });
});
