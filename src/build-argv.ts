/**
 * @fileoverview Builds canonical argv arrays and a redacted argv variant for testing-identities
 * workflow shells that spawn `npx tsx` against repository workflow scripts.
 *
 * This file owns workflow-specific flag wiring, optional empty-string suppression, secret redaction
 * for UI previews, and resolution of absolute script paths from the shared workflow catalog.
 * Flow: discriminated workflow input -> canonical argv -> optional redacted copy for display;
 * `TestingIdentitiesKit_scriptAbsolutePath` joins repo roots with catalog `scriptPathUnderRepo`.
 *
 * @example
 * ```typescript
 * import { TestingIdentitiesKit_buildArgv } from "@gg-utils/testing-identities-kit/build-argv";
 *
 * TestingIdentitiesKit_buildArgv({
 *   workflow: "allocate",
 *   purpose: "e2e",
 *   runId: "run-1",
 * });
 * ```
 *
 * @testing Jest unit: npm run test -- identity-workflows/ui/lib/__tests__/build-argv.unit.test.ts
 *
 * @see identity-workflows/ui/lib/build-argv.ts - Root testing-identities UI re-export that forwards to these kit functions so the Jest suite above exercises the same argv wiring production UIs rely on.
 * @see packages/testing-identities-kit/src/contracts.ts - Discriminated workflow input types and per-workflow fields consumed by the argv builders in this module.
 * @see packages/testing-identities-kit/src/workflows.ts - Workflow catalog lookup supplying `scriptPathUnderRepo` for `TestingIdentitiesKit_scriptAbsolutePath` resolution.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import path from "node:path";

import type {
  TestingIdentitiesKit_BuildArgvInput,
  TestingIdentitiesKit_WorkflowDefinition,
  TestingIdentitiesKit_WorkflowId,
} from "./contracts.js";
import { TestingIdentitiesKit_findWorkflow } from "./workflows.js";

export type {
  TestingIdentitiesKit_AllocateInput,
  TestingIdentitiesKit_BuildArgvInput,
  TestingIdentitiesKit_EnsureApplicantInput,
  TestingIdentitiesKit_EnsureAuthInput,
  TestingIdentitiesKit_FixtureHygieneInput,
} from "./contracts.js";

const REDACTED_PLACEHOLDER = "<redacted>";

/** Appends a flag and trimmed value pair to an argv array when the value is usable on the CLI. */
function pushOptionalFlag(
  argv: string[],
  flag: string,
  value: string | undefined,
): void {
  if (value === undefined || value.trim().length === 0) {
    return;
  }
  argv.push(flag, value.trim());
}

/** Builds argv passed to `npx tsx <script> ...`; display callers should redact secrets separately. */
export function TestingIdentitiesKit_buildArgv(
  input: TestingIdentitiesKit_BuildArgvInput,
): string[] {
  switch (input.workflow) {
    case "allocate": {
      const argv: string[] = [];
      pushOptionalFlag(argv, "--purpose", input.purpose);
      pushOptionalFlag(argv, "--run-id", input.runId);
      return argv;
    }
    case "ensureAuth": {
      const argv = ["--email", input.email.trim()];
      pushOptionalFlag(argv, "--password", input.password);
      pushOptionalFlag(argv, "--user-name", input.userName);
      pushOptionalFlag(argv, "--website-url", input.websiteUrl);
      if (input.allowRealEmail) {
        argv.push("--allow-real-email");
      }
      return argv;
    }
    case "ensureApplicant": {
      const argv = ["--email", input.email.trim()];
      pushOptionalFlag(argv, "--actor-user-token", input.actorUserToken);
      pushOptionalFlag(argv, "--source", input.source);
      pushOptionalFlag(argv, "--api-url", input.apiUrl);
      pushOptionalFlag(argv, "--password", input.password);
      pushOptionalFlag(argv, "--user-name", input.userName);
      if (input.allowRealEmail) {
        argv.push("--allow-real-email");
      }
      return argv;
    }
    case "fixtureHygiene": {
      const argv = ["--json"];
      if (input.strict) {
        argv.push("--strict");
      }
      return argv;
    }
  }
}

/** Returns argv with secrets replaced for on-screen previews only. */
export function TestingIdentitiesKit_buildArgvRedactedForDisplay(
  input: TestingIdentitiesKit_BuildArgvInput,
): string[] {
  const real = TestingIdentitiesKit_buildArgv(input);
  if (input.workflow !== "ensureAuth" && input.workflow !== "ensureApplicant") {
    return real;
  }

  const out: string[] = [];
  for (let index = 0; index < real.length; index += 1) {
    const token = real[index];
    if (!token) {
      continue;
    }
    if (token === "--password" || token === "--actor-user-token") {
      out.push(token, REDACTED_PLACEHOLDER);
      index += 1;
      continue;
    }
    out.push(token);
  }
  return out;
}

/** Resolves the absolute path to the workflow script under a repository root. */
export function TestingIdentitiesKit_scriptAbsolutePath(options: {
  projectRoot: string;
  workflow: TestingIdentitiesKit_WorkflowId;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
}): string {
  const { scriptPathUnderRepo } = TestingIdentitiesKit_findWorkflow({
    id: options.workflow,
    workflows: options.workflows,
  });
  return path.join(options.projectRoot, scriptPathUnderRepo);
}
