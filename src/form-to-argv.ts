/**
 * @fileoverview Maps aggregated testing-identities UI form fields into the discriminated argv
 * builder input union consumed by {@link TestingIdentitiesKit_buildArgv}.
 *
 * This file owns workflow-branching normalization (trim, optional empty-string clearing) from the
 * shared `TestingIdentitiesKit_FormFields` bundle plus a small preflight validator for email-backed
 * workflows. Flow: UI field map -> per-workflow argv input -> `build-argv` flag assembly.
 *
 * @example
 * ```typescript
 * import {
 *   TestingIdentitiesKit_formFieldsToArgvInput,
 *   TestingIdentitiesKit_validateEmailWorkflow,
 * } from "@gg-utils/testing-identities-kit/form-to-argv";
 *
 * const input = TestingIdentitiesKit_formFieldsToArgvInput({
 *   workflowId: "ensureAuth",
 *   fields: {
 *     allocatePurpose: "",
 *     allocateRunId: "",
 *     ensureEmail: "ops@example.com",
 *     ensurePassword: "",
 *     ensureUserName: "",
 *     ensureWebsiteUrl: "",
 *     ensureAllowReal: false,
 *     applicantActorToken: "",
 *     applicantSource: "",
 *     applicantApiUrl: "",
 *     applicantPassword: "",
 *     applicantUserName: "",
 *     applicantAllowReal: false,
 *     fixtureStrict: false,
 *   },
 * });
 *
 * const emailError = TestingIdentitiesKit_validateEmailWorkflow({
 *   workflowId: "ensureAuth",
 *   email: "ops@example.com",
 * });
 * ```
 *
 * @testing Jest unit: npm run test -- identity-workflows/ui/lib/__tests__/form-to-argv.unit.test.ts
 *
 * @see packages/testing-identities-kit/src/contracts.ts - Shared workflow ids, aggregated form-field bundle, and argv input union types this mapper materializes for argv builders.
 * @see packages/testing-identities-kit/src/build-argv.ts - Canonical argv assembly that consumes the discriminated workflow input produced here before spawning repository workflow scripts.
 * @see identity-workflows/ui/lib/form-to-argv.ts - Root testing-identities UI compatibility wrapper that re-exports these kit helpers so the Jest suite above exercises the same import path interactive shells use.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import type {
  TestingIdentitiesKit_BuildArgvInput,
  TestingIdentitiesKit_FormFields,
  TestingIdentitiesKit_WorkflowId,
} from "./contracts.js";

export type { TestingIdentitiesKit_FormFields } from "./contracts.js";

/** Maps aggregated UI fields into the argv input union consumed by argv builders. */
export function TestingIdentitiesKit_formFieldsToArgvInput(options: {
  workflowId: TestingIdentitiesKit_WorkflowId;
  fields: TestingIdentitiesKit_FormFields;
}): TestingIdentitiesKit_BuildArgvInput {
  const formFields = options.fields;
  switch (options.workflowId) {
    case "allocate":
      return {
        workflow: "allocate",
        purpose: formFields.allocatePurpose.trim() || undefined,
        runId: formFields.allocateRunId.trim() || undefined,
      };
    case "ensureAuth":
      return {
        workflow: "ensureAuth",
        email: formFields.ensureEmail.trim(),
        password: formFields.ensurePassword.trim() || undefined,
        userName: formFields.ensureUserName.trim() || undefined,
        websiteUrl: formFields.ensureWebsiteUrl.trim() || undefined,
        allowRealEmail: formFields.ensureAllowReal,
      };
    case "ensureApplicant":
      return {
        workflow: "ensureApplicant",
        email: formFields.ensureEmail.trim(),
        actorUserToken: formFields.applicantActorToken.trim() || undefined,
        source: formFields.applicantSource.trim() || undefined,
        apiUrl: formFields.applicantApiUrl.trim() || undefined,
        password: formFields.applicantPassword.trim() || undefined,
        userName: formFields.applicantUserName.trim() || undefined,
        allowRealEmail: formFields.applicantAllowReal,
      };
    case "fixtureHygiene":
      return {
        workflow: "fixtureHygiene",
        strict: formFields.fixtureStrict,
      };
  }
}

/** Validates that email-backed workflows include a non-empty email before launch. */
export function TestingIdentitiesKit_validateEmailWorkflow(options: {
  workflowId: TestingIdentitiesKit_WorkflowId;
  email: string;
}): string | null {
  if (
    (options.workflowId === "ensureAuth" ||
      options.workflowId === "ensureApplicant") &&
    options.email.trim().length === 0
  ) {
    return "--email is required for this workflow.";
  }
  return null;
}
