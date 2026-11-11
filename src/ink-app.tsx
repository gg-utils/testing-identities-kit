/**
 * @fileoverview Renders the package-owned Ink workflow wizard for configured testing identities.
 *
 * Reusable Ink state, keyboard handling, command previews, child-process streaming, and result
 * parsing live here. Host workspaces inject repo roots, workflow paths, npm aliases, and labels
 * through `TestingIdentitiesKit_UiConfig`.
 *
 * @testing Node unit: npm run testing-identities-kit:test
 * @see packages/testing-identities-kit/src/format-preview.ts - Supplies command preview strings.
 * @see packages/testing-identities-kit/src/ink-task.ts - Streams child-process output into Ink.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Box, Text, useApp, useInput, type Key } from "ink";

import {
  TestingIdentitiesKit_buildArgv,
  TestingIdentitiesKit_buildArgvRedactedForDisplay,
  TestingIdentitiesKit_scriptAbsolutePath,
} from "./build-argv.js";
import type {
  TestingIdentitiesKit_UiConfig,
  TestingIdentitiesKit_WorkflowDefinition,
  TestingIdentitiesKit_WorkflowId,
} from "./contracts.js";
import {
  TestingIdentitiesKit_formFieldsToArgvInput,
  TestingIdentitiesKit_validateEmailWorkflow,
} from "./form-to-argv.js";
import { TestingIdentitiesKit_formatCommandLine } from "./format-command.js";
import { TestingIdentitiesKit_formatCommandPreviewLines } from "./format-preview.js";
import {
  TestingIdentitiesKit_startInkCliTaskProcess,
  type TestingIdentitiesKit_InkSessionLine,
  type TestingIdentitiesKit_InkTaskExecutionResult,
} from "./ink-task.js";
import { TestingIdentitiesKit_parseLastJsonObject } from "./parse-stdout-json.js";

/** Renders a titled command line block using Ink text wrapping. */
function TestingIdentitiesKitInkCommandPreview(props: {
  commandLine: string;
  title?: string;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold>{props.title ?? "Command"}</Text>
      <Text wrap="wrap">{props.commandLine}</Text>
    </Box>
  );
}

/** Returns the last `count` lines from a captured output buffer. */
function TestingIdentitiesKit_sliceRecentInkLines<T>(
  lines: readonly T[],
  count: number,
): T[] {
  if (lines.length <= count) {
    return [...lines];
  }
  return lines.slice(lines.length - count);
}

/** Renders captured subprocess output for Ink result and session panels. */
function TestingIdentitiesKitInkCapturedOutputBlock(props: {
  bracketSource?: boolean;
  lines: readonly TestingIdentitiesKit_InkSessionLine[];
  maxLines: number;
  title: string;
}): React.JSX.Element {
  const recent = TestingIdentitiesKit_sliceRecentInkLines(
    props.lines,
    props.maxLines,
  );
  return (
    <Box flexDirection="column" marginTop={props.title ? 1 : 0}>
      {props.title ? <Text bold>{props.title}</Text> : null}
      {recent.map((line, index) => (
        <Text
          key={`${line.source}:${String(index)}`}
          color={line.source === "stderr" ? "red" : "white"}
        >
          {props.bracketSource ? `[${line.source}] ${line.text}` : line.text}
        </Text>
      ))}
    </Box>
  );
}

/** Top-of-screen header for the package-owned Ink app. */
function TestingIdentitiesKitInkScreenHeader(props: {
  appName: string;
  description: string;
  summary: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="green">
        {props.appName}
      </Text>
      <Text color="gray">{props.description}</Text>
      <Box>{props.summary}</Box>
    </Box>
  );
}

/** Renders keyboard shortcut hints under the active panel. */
function TestingIdentitiesKitInkLegend(props: {
  lines: readonly string[];
}): React.JSX.Element {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold>Keys</Text>
      {props.lines.map((line, index) => (
        <Text key={String(index)} color="gray">
          {line}
        </Text>
      ))}
    </Box>
  );
}

/** Reads an own property from an unknown object without unsafe object shape assertions. */
function TestingIdentitiesKit_readUnknownProperty(
  value: unknown,
  key: string,
): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

/** Extracts the optional allocation email emitted by allocate workflows. */
function TestingIdentitiesKit_extractAllocationEmail(
  value: unknown,
): string | null {
  const allocation = TestingIdentitiesKit_readUnknownProperty(
    value,
    "allocation",
  );
  const email = TestingIdentitiesKit_readUnknownProperty(allocation, "email");
  return typeof email === "string" ? email : null;
}

/**
 * Discriminates which Ink wizard screen owns keyboard handling and layout.
 */
type InkStep = "workflow" | "form" | "review" | "session" | "result";

/** Terminal outcome metadata persisted after a spawned testing-identities CLI task settles. */
type TestingIdentitiesInk_SessionDoneSummary = {
  status: "succeeded" | "failed" | "cancelled";
  exitCode: number | null;
};

/**
 * Resolves the workflow id for a zero-based index into the fixed workflow list.
 *
 * @remarks
 * PRE-CONDITION: `index` must align with `workflows` ordering used by arrow-key navigation.
 * @throws Error when the index is out of range.
 */
function workflowIdAtIndex(options: {
  index: number;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
}): TestingIdentitiesKit_WorkflowId {
  const w = options.workflows[options.index];
  if (!w) {
    throw new Error("Invalid workflow index.");
  }
  return w.id;
}

/**
 * Truncates a field value by one code unit for Ink backspace/delete handling.
 *
 * @remarks
 * PURITY: pure; does not mutate the caller's string instance.
 */
function trimOne(value: string): string {
  return value.slice(0, Math.max(0, value.length - 1));
}

/**
 * Resolves the inclusive upper index for Tab field rotation for the active workflow form.
 */
function testingIdentitiesInk_resolveFormSlotMax(
  workflowId: TestingIdentitiesKit_WorkflowId,
): number {
  switch (workflowId) {
    case "allocate":
      return 1;
    case "ensureAuth":
      return 4;
    case "ensureApplicant":
      return 6;
    case "fixtureHygiene":
      return 0;
    default: {
      const _x: never = workflowId;
      return _x;
    }
  }
}

/**
 * Applies a printable character or delete key event to one optional string field.
 */
function applyOptionalStringFieldKey(options: {
  del: boolean;
  input: string;
  key: Pick<Key, "ctrl" | "meta">;
  setValue: Dispatch<SetStateAction<string>>;
}): void {
  if (options.del) {
    options.setValue(trimOne);
    return;
  }
  // Form helpers append printable input only; Ctrl/Meta combinations remain reserved shortcuts.
  if (options.input && !options.key.ctrl && !options.key.meta) {
    options.setValue((t) => t + options.input);
  }
}

/**
 * Handles the global Ctrl+C shortcut and reports whether it consumed the key event.
 */
function testingIdentitiesInk_tryHandleCtrlC(
  input: string,
  key: Key,
  exit: () => void,
): boolean {
  if (key.ctrl && input === "c") {
    exit();
    return true;
  }
  return false;
}

/**
 * Handles keys that are valid while the spawned CLI task is still running.
 */
function testingIdentitiesInk_handleSessionInput(
  input: string,
  runCancel: (() => void) | null,
): void {
  if (input === "q" && runCancel) {
    runCancel();
  }
}

/**
 * Handles post-run result shortcuts for quitting, restarting, or reusing the allocated email.
 */
function testingIdentitiesInk_handleResultInput(options: {
  input: string;
  key: Key;
  exit: () => void;
  lastAllocatedEmail: string | null;
  setStep: Dispatch<SetStateAction<InkStep>>;
  setSessionDone: Dispatch<
    SetStateAction<TestingIdentitiesInk_SessionDoneSummary | null>
  >;
  setParsedSummary: Dispatch<SetStateAction<string | null>>;
  setEnsureEmail: Dispatch<SetStateAction<string>>;
  setWorkflowIndex: Dispatch<SetStateAction<number>>;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
}): void {
  if (options.key.escape || options.input === "q") {
    options.exit();
    return;
  }
  if (options.input === "r") {
    options.setStep("workflow");
    options.setSessionDone(null);
    options.setParsedSummary(null);
    return;
  }
  if (options.input === "u" && options.lastAllocatedEmail) {
    options.setEnsureEmail(options.lastAllocatedEmail);
    const idx = options.workflows.findIndex((w) => w.id === "ensureAuth");
    options.setWorkflowIndex(idx >= 0 ? idx : 0);
    options.setStep("form");
  }
}

/**
 * Starts a reviewed command run when the operator presses Enter.
 */
function testingIdentitiesInk_handleReviewInput(
  key: Key,
  setSessionNonce: Dispatch<SetStateAction<number>>,
  setStep: Dispatch<SetStateAction<InkStep>>,
): void {
  if (key.return) {
    setSessionNonce((n) => n + 1);
    setStep("session");
  }
}

/**
 * Moves the workflow selector or enters the selected workflow form.
 */
function testingIdentitiesInk_handleWorkflowInput(
  key: Key,
  workflowCount: number,
  setWorkflowIndex: Dispatch<SetStateAction<number>>,
  setStep: Dispatch<SetStateAction<InkStep>>,
): void {
  if (key.upArrow) {
    setWorkflowIndex((i) => Math.max(0, i - 1));
  }
  if (key.downArrow) {
    setWorkflowIndex((i) => Math.min(workflowCount - 1, i + 1));
  }
  if (key.return) {
    setStep("form");
  }
}

/**
 * Handles the fixture-hygiene form's strict-mode toggle and continue shortcut.
 */
function testingIdentitiesInk_handleFixtureHygieneKeys(
  input: string,
  key: Key,
  setFixtureStrict: Dispatch<SetStateAction<boolean>>,
  goNextFromForm: () => void,
): void {
  if (input === " " || key.return) {
    if (input === " ") {
      setFixtureStrict((v) => !v);
    }
    if (key.return) {
      goNextFromForm();
    }
  }
}

/**
 * Applies text editing keys to the allocate workflow fields.
 */
function testingIdentitiesInk_handleAllocateFormKeys(options: {
  formSlot: number;
  del: boolean;
  input: string;
  key: Key;
  setAllocatePurpose: Dispatch<SetStateAction<string>>;
  setAllocateRunId: Dispatch<SetStateAction<string>>;
}): void {
  if (options.formSlot === 0) {
    applyOptionalStringFieldKey({
      del: options.del,
      input: options.input,
      key: options.key,
      setValue: options.setAllocatePurpose,
    });
    return;
  }
  if (options.formSlot === 1) {
    applyOptionalStringFieldKey({
      del: options.del,
      input: options.input,
      key: options.key,
      setValue: options.setAllocateRunId,
    });
  }
}

/**
 * Applies text editing and boolean toggle keys to the ensure-auth workflow fields.
 */
function testingIdentitiesInk_handleEnsureAuthFormKeys(options: {
  formSlot: number;
  del: boolean;
  input: string;
  key: Key;
  setEnsureEmail: Dispatch<SetStateAction<string>>;
  setEnsurePassword: Dispatch<SetStateAction<string>>;
  setEnsureUserName: Dispatch<SetStateAction<string>>;
  setEnsureWebsiteUrl: Dispatch<SetStateAction<string>>;
  setEnsureAllowReal: Dispatch<SetStateAction<boolean>>;
}): void {
  const stringSetters: Array<Dispatch<SetStateAction<string>>> = [
    options.setEnsureEmail,
    options.setEnsurePassword,
    options.setEnsureUserName,
    options.setEnsureWebsiteUrl,
  ];
  if (options.formSlot < 4) {
    const set = stringSetters[options.formSlot];
    if (set) {
      applyOptionalStringFieldKey({
        del: options.del,
        input: options.input,
        key: options.key,
        setValue: set,
      });
    }
    return;
  }
  if (options.formSlot === 4 && options.input === " ") {
    options.setEnsureAllowReal((v) => !v);
  }
}

/**
 * Applies text editing and boolean toggle keys to the ensure-applicant workflow fields.
 */
function testingIdentitiesInk_handleEnsureApplicantFormKeys(options: {
  formSlot: number;
  del: boolean;
  input: string;
  key: Key;
  setEnsureEmail: Dispatch<SetStateAction<string>>;
  setApplicantActorToken: Dispatch<SetStateAction<string>>;
  setApplicantSource: Dispatch<SetStateAction<string>>;
  setApplicantApiUrl: Dispatch<SetStateAction<string>>;
  setApplicantPassword: Dispatch<SetStateAction<string>>;
  setApplicantUserName: Dispatch<SetStateAction<string>>;
  setApplicantAllowReal: Dispatch<SetStateAction<boolean>>;
}): void {
  const setters: Array<Dispatch<SetStateAction<string>>> = [
    options.setEnsureEmail,
    options.setApplicantActorToken,
    options.setApplicantSource,
    options.setApplicantApiUrl,
    options.setApplicantPassword,
    options.setApplicantUserName,
  ];
  if (options.formSlot < 6) {
    const set = setters[options.formSlot];
    if (set) {
      applyOptionalStringFieldKey({
        del: options.del,
        input: options.input,
        key: options.key,
        setValue: set,
      });
    }
    return;
  }
  if (options.formSlot === 6 && options.input === " ") {
    options.setApplicantAllowReal((v) => !v);
  }
}

/**
 * Routes form-step keyboard input to the active workflow-specific form handler.
 */
function testingIdentitiesInk_handleFormStepKeys(options: {
  input: string;
  key: Key;
  workflowIndex: number;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
  formSlot: number;
  formSlotMax: number;
  setFormSlot: Dispatch<SetStateAction<number>>;
  setFixtureStrict: Dispatch<SetStateAction<boolean>>;
  goNextFromForm: () => void;
  setAllocatePurpose: Dispatch<SetStateAction<string>>;
  setAllocateRunId: Dispatch<SetStateAction<string>>;
  setEnsureEmail: Dispatch<SetStateAction<string>>;
  setEnsurePassword: Dispatch<SetStateAction<string>>;
  setEnsureUserName: Dispatch<SetStateAction<string>>;
  setEnsureWebsiteUrl: Dispatch<SetStateAction<string>>;
  setEnsureAllowReal: Dispatch<SetStateAction<boolean>>;
  setApplicantActorToken: Dispatch<SetStateAction<string>>;
  setApplicantSource: Dispatch<SetStateAction<string>>;
  setApplicantApiUrl: Dispatch<SetStateAction<string>>;
  setApplicantPassword: Dispatch<SetStateAction<string>>;
  setApplicantUserName: Dispatch<SetStateAction<string>>;
  setApplicantAllowReal: Dispatch<SetStateAction<boolean>>;
}): void {
  const id = workflowIdAtIndex({
    index: options.workflowIndex,
    workflows: options.workflows,
  });

  if (options.key.tab) {
    options.setFormSlot((s) =>
      options.formSlotMax === 0 ? 0 : (s + 1) % (options.formSlotMax + 1),
    );
    return;
  }

  if (id === "fixtureHygiene") {
    testingIdentitiesInk_handleFixtureHygieneKeys(
      options.input,
      options.key,
      options.setFixtureStrict,
      options.goNextFromForm,
    );
    return;
  }

  if (options.key.return) {
    options.goNextFromForm();
    return;
  }

  const del = options.key.backspace || options.key.delete;

  if (id === "allocate") {
    testingIdentitiesInk_handleAllocateFormKeys({
      formSlot: options.formSlot,
      del,
      input: options.input,
      key: options.key,
      setAllocatePurpose: options.setAllocatePurpose,
      setAllocateRunId: options.setAllocateRunId,
    });
    return;
  }

  if (id === "ensureAuth") {
    testingIdentitiesInk_handleEnsureAuthFormKeys({
      formSlot: options.formSlot,
      del,
      input: options.input,
      key: options.key,
      setEnsureEmail: options.setEnsureEmail,
      setEnsurePassword: options.setEnsurePassword,
      setEnsureUserName: options.setEnsureUserName,
      setEnsureWebsiteUrl: options.setEnsureWebsiteUrl,
      setEnsureAllowReal: options.setEnsureAllowReal,
    });
    return;
  }

  if (id === "ensureApplicant") {
    testingIdentitiesInk_handleEnsureApplicantFormKeys({
      formSlot: options.formSlot,
      del,
      input: options.input,
      key: options.key,
      setEnsureEmail: options.setEnsureEmail,
      setApplicantActorToken: options.setApplicantActorToken,
      setApplicantSource: options.setApplicantSource,
      setApplicantApiUrl: options.setApplicantApiUrl,
      setApplicantPassword: options.setApplicantPassword,
      setApplicantUserName: options.setApplicantUserName,
      setApplicantAllowReal: options.setApplicantAllowReal,
    });
  }
}

/**
 * Dispatches one Ink input event according to the active wizard step.
 */
function testingIdentitiesInk_dispatchInput(options: {
  input: string;
  key: Key;
  step: InkStep;
  workflowIndex: number;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
  formSlot: number;
  formSlotMax: number;
  lastAllocatedEmail: string | null;
  runCancel: (() => void) | null;
  exit: () => void;
  goBack: () => void;
  goNextFromForm: () => void;
  setSessionNonce: Dispatch<SetStateAction<number>>;
  setStep: Dispatch<SetStateAction<InkStep>>;
  setSessionDone: Dispatch<
    SetStateAction<TestingIdentitiesInk_SessionDoneSummary | null>
  >;
  setParsedSummary: Dispatch<SetStateAction<string | null>>;
  setEnsureEmail: Dispatch<SetStateAction<string>>;
  setWorkflowIndex: Dispatch<SetStateAction<number>>;
  setFormSlot: Dispatch<SetStateAction<number>>;
  setFixtureStrict: Dispatch<SetStateAction<boolean>>;
  setAllocatePurpose: Dispatch<SetStateAction<string>>;
  setAllocateRunId: Dispatch<SetStateAction<string>>;
  setEnsurePassword: Dispatch<SetStateAction<string>>;
  setEnsureUserName: Dispatch<SetStateAction<string>>;
  setEnsureWebsiteUrl: Dispatch<SetStateAction<string>>;
  setEnsureAllowReal: Dispatch<SetStateAction<boolean>>;
  setApplicantActorToken: Dispatch<SetStateAction<string>>;
  setApplicantSource: Dispatch<SetStateAction<string>>;
  setApplicantApiUrl: Dispatch<SetStateAction<string>>;
  setApplicantPassword: Dispatch<SetStateAction<string>>;
  setApplicantUserName: Dispatch<SetStateAction<string>>;
  setApplicantAllowReal: Dispatch<SetStateAction<boolean>>;
}): void {
  if (
    testingIdentitiesInk_tryHandleCtrlC(
      options.input,
      options.key,
      options.exit,
    )
  ) {
    return;
  }

  if (options.step === "session") {
    testingIdentitiesInk_handleSessionInput(options.input, options.runCancel);
    return;
  }

  if (options.step === "result") {
    testingIdentitiesInk_handleResultInput({
      input: options.input,
      key: options.key,
      exit: options.exit,
      lastAllocatedEmail: options.lastAllocatedEmail,
      setStep: options.setStep,
      setSessionDone: options.setSessionDone,
      setParsedSummary: options.setParsedSummary,
      setEnsureEmail: options.setEnsureEmail,
      setWorkflowIndex: options.setWorkflowIndex,
      workflows: options.workflows,
    });
    return;
  }

  if (options.key.escape) {
    options.goBack();
    return;
  }

  if (options.step === "review") {
    testingIdentitiesInk_handleReviewInput(
      options.key,
      options.setSessionNonce,
      options.setStep,
    );
    return;
  }

  if (options.step === "workflow") {
    testingIdentitiesInk_handleWorkflowInput(
      options.key,
      options.workflows.length,
      options.setWorkflowIndex,
      options.setStep,
    );
    return;
  }

  if (options.step === "form") {
    testingIdentitiesInk_handleFormStepKeys({
      input: options.input,
      key: options.key,
      workflowIndex: options.workflowIndex,
      workflows: options.workflows,
      formSlot: options.formSlot,
      formSlotMax: options.formSlotMax,
      setFormSlot: options.setFormSlot,
      setFixtureStrict: options.setFixtureStrict,
      goNextFromForm: options.goNextFromForm,
      setAllocatePurpose: options.setAllocatePurpose,
      setAllocateRunId: options.setAllocateRunId,
      setEnsureEmail: options.setEnsureEmail,
      setEnsurePassword: options.setEnsurePassword,
      setEnsureUserName: options.setEnsureUserName,
      setEnsureWebsiteUrl: options.setEnsureWebsiteUrl,
      setEnsureAllowReal: options.setEnsureAllowReal,
      setApplicantActorToken: options.setApplicantActorToken,
      setApplicantSource: options.setApplicantSource,
      setApplicantApiUrl: options.setApplicantApiUrl,
      setApplicantPassword: options.setApplicantPassword,
      setApplicantUserName: options.setApplicantUserName,
      setApplicantAllowReal: options.setApplicantAllowReal,
    });
  }
}

/**
 * Builds the step-specific legend lines shown in the terminal chrome.
 */
function testingIdentitiesInk_legendLines(options: {
  step: InkStep;
  workflowId: TestingIdentitiesKit_WorkflowId;
  lastAllocatedEmail: string | null;
}): string[] {
  const { step, workflowId, lastAllocatedEmail } = options;
  if (step === "review") {
    return ["Enter run | Esc back | Ctrl+C quit"];
  }
  if (step === "session") {
    return [
      "Live run in progress. Press q to cancel.",
      "Escape disabled until the process finishes.",
    ];
  }
  if (step === "result") {
    return [
      "Esc or q quit | r restart wizard",
      lastAllocatedEmail ? `u use allocated email (${lastAllocatedEmail})` : "",
    ].filter(Boolean);
  }
  if (step === "workflow") {
    return ["Enter next | Up/Down | Esc quit | Ctrl+C quit"];
  }
  if (step === "form") {
    return [
      "Enter review | Tab next field | Esc back | Ctrl+C quit",
      workflowId === "fixtureHygiene"
        ? "Space toggle strict | Enter continue"
        : "",
    ].filter(Boolean);
  }
  return ["Ctrl+C quit"];
}

/**
 * Persists terminal run metadata, parses stdout JSON, and moves the wizard to the result panel.
 */
function testingIdentitiesInk_finalizeSessionTask(options: {
  result: TestingIdentitiesKit_InkTaskExecutionResult;
  argvWorkflow: TestingIdentitiesKit_WorkflowId;
  setSessionDone: Dispatch<
    SetStateAction<TestingIdentitiesInk_SessionDoneSummary | null>
  >;
  setRunCancel: Dispatch<SetStateAction<(() => void) | null>>;
  setParsedSummary: Dispatch<SetStateAction<string | null>>;
  setLastAllocatedEmail: Dispatch<SetStateAction<string | null>>;
  setStep: Dispatch<SetStateAction<InkStep>>;
}): void {
  options.setSessionDone({
    status: options.result.status,
    exitCode: options.result.exitCode,
  });
  options.setRunCancel(null);

  const stdoutText = options.result.lines
    .filter((l) => l.source === "stdout")
    .map((l) => l.text)
    .join("\n");
  const parsed = TestingIdentitiesKit_parseLastJsonObject(stdoutText);
  if (parsed.ok && options.result.status === "succeeded") {
    options.setParsedSummary(JSON.stringify(parsed.value, null, 2));
    if (options.argvWorkflow === "allocate") {
      const allocationEmail = TestingIdentitiesKit_extractAllocationEmail(
        parsed.value,
      );
      if (allocationEmail !== null) {
        options.setLastAllocatedEmail(allocationEmail);
      }
    }
  } else {
    options.setParsedSummary(null);
  }

  options.setStep("result");
}

/**
 * Renders the workflow picker list with the active item highlighted.
 */
function TestingIdentitiesInkWorkflowPanel(props: {
  workflowIndex: number;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold>Workflow</Text>
      {props.workflows.map((w, index) => (
        <Text
          key={w.id}
          {...(index === props.workflowIndex ? { color: "cyan" } : {})}
        >
          {index === props.workflowIndex ? "> " : "  "}
          {w.label}
        </Text>
      ))}
    </Box>
  );
}

/** Props for `TestingIdentitiesInkFormPanel` and its workflow-specific section renderers. */
type TestingIdentitiesInkFormPanel_Props = {
  workflowIndex: number;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
  workflowId: TestingIdentitiesKit_WorkflowId;
  formError: string | null;
  formSlot: number;
  allocatePurpose: string;
  allocateRunId: string;
  ensureEmail: string;
  ensurePassword: string;
  ensureUserName: string;
  ensureWebsiteUrl: string;
  ensureAllowReal: boolean;
  applicantActorToken: string;
  applicantSource: string;
  applicantApiUrl: string;
  applicantPassword: string;
  applicantUserName: string;
  applicantAllowReal: boolean;
  fixtureStrict: boolean;
};

/**
 * Renders allocate workflow fields when the active workflow id is `allocate`.
 */
function testingIdentitiesInkFormPanel_allocateSection(
  props: TestingIdentitiesInkFormPanel_Props,
): React.JSX.Element | null {
  if (props.workflowId !== "allocate") {
    return null;
  }
  return (
    <Box flexDirection="column">
      <Text {...(props.formSlot === 0 ? { color: "cyan" } : {})}>
        Purpose [--purpose]: {props.allocatePurpose || "(empty)"}
      </Text>
      <Text {...(props.formSlot === 1 ? { color: "cyan" } : {})}>
        Run id [--run-id]: {props.allocateRunId || "(empty)"}
      </Text>
    </Box>
  );
}

/**
 * Renders ensure-auth workflow fields when the active workflow id is `ensureAuth`.
 */
function testingIdentitiesInkFormPanel_ensureAuthSection(
  props: TestingIdentitiesInkFormPanel_Props,
): React.JSX.Element | null {
  if (props.workflowId !== "ensureAuth") {
    return null;
  }
  return (
    <Box flexDirection="column">
      <Text {...(props.formSlot === 0 ? { color: "cyan" } : {})}>
        Email [--email]: {props.ensureEmail || "(required)"}
      </Text>
      <Text {...(props.formSlot === 1 ? { color: "cyan" } : {})}>
        Password: {"*".repeat(props.ensurePassword.length)}
      </Text>
      <Text {...(props.formSlot === 2 ? { color: "cyan" } : {})}>
        User name: {props.ensureUserName || "(empty)"}
      </Text>
      <Text {...(props.formSlot === 3 ? { color: "cyan" } : {})}>
        Website URL: {props.ensureWebsiteUrl || "(empty)"}
      </Text>
      <Text {...(props.formSlot === 4 ? { color: "cyan" } : {})}>
        Allow real email: {props.ensureAllowReal ? "yes" : "no"} (Space)
      </Text>
    </Box>
  );
}

/**
 * Renders ensure-applicant workflow fields when the active workflow id is `ensureApplicant`.
 */
function testingIdentitiesInkFormPanel_ensureApplicantSection(
  props: TestingIdentitiesInkFormPanel_Props,
): React.JSX.Element | null {
  if (props.workflowId !== "ensureApplicant") {
    return null;
  }
  return (
    <Box flexDirection="column">
      <Text {...(props.formSlot === 0 ? { color: "cyan" } : {})}>
        Email [--email]: {props.ensureEmail || "(required)"}
      </Text>
      <Text {...(props.formSlot === 1 ? { color: "cyan" } : {})}>
        Actor token: {"*".repeat(props.applicantActorToken.length)}
      </Text>
      <Text {...(props.formSlot === 2 ? { color: "cyan" } : {})}>
        Source: {props.applicantSource || "(empty)"}
      </Text>
      <Text {...(props.formSlot === 3 ? { color: "cyan" } : {})}>
        API URL: {props.applicantApiUrl || "(empty)"}
      </Text>
      <Text {...(props.formSlot === 4 ? { color: "cyan" } : {})}>
        Password: {"*".repeat(props.applicantPassword.length)}
      </Text>
      <Text {...(props.formSlot === 5 ? { color: "cyan" } : {})}>
        User name: {props.applicantUserName || "(empty)"}
      </Text>
      <Text {...(props.formSlot === 6 ? { color: "cyan" } : {})}>
        Allow real email: {props.applicantAllowReal ? "yes" : "no"} (Space)
      </Text>
    </Box>
  );
}

/**
 * Renders fixture-hygiene workflow fields when the active workflow id is `fixtureHygiene`.
 */
function testingIdentitiesInkFormPanel_fixtureHygieneSection(
  props: TestingIdentitiesInkFormPanel_Props,
): React.JSX.Element | null {
  if (props.workflowId !== "fixtureHygiene") {
    return null;
  }
  return (
    <Box flexDirection="column">
      <Text>Strict mode (--strict): {props.fixtureStrict ? "yes" : "no"}</Text>
      <Text dimColor>Space toggles | Enter continues</Text>
    </Box>
  );
}

/**
 * Renders the workflow-specific form fields and current validation error.
 */
function TestingIdentitiesInkFormPanel(
  props: TestingIdentitiesInkFormPanel_Props,
): React.JSX.Element {
  const workflowLabel = props.workflows[props.workflowIndex]?.label;
  return (
    <Box flexDirection="column">
      <Text bold>Form ({workflowLabel})</Text>
      {props.formError ? <Text color="red">{props.formError}</Text> : null}
      {testingIdentitiesInkFormPanel_allocateSection(props)}
      {testingIdentitiesInkFormPanel_ensureAuthSection(props)}
      {testingIdentitiesInkFormPanel_ensureApplicantSection(props)}
      {testingIdentitiesInkFormPanel_fixtureHygieneSection(props)}
    </Box>
  );
}

/**
 * Renders the redacted command preview before the operator starts a run.
 */
function TestingIdentitiesInkReviewPanel(props: {
  previewLinesRedacted: string[];
  npxCommandLineRedacted: string;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <TestingIdentitiesKitInkCommandPreview
        title="Commands (redacted)"
        commandLine={props.previewLinesRedacted.join("\n")}
      />
      <Box marginTop={1}>
        <TestingIdentitiesKitInkCommandPreview
          title="npx line (redacted)"
          commandLine={props.npxCommandLineRedacted}
        />
      </Box>
    </Box>
  );
}

/**
 * Renders the live task output while the spawned CLI process is running.
 */
function TestingIdentitiesInkSessionPanel(props: {
  npxCommandLineRedacted: string;
  sessionLines: TestingIdentitiesKit_InkSessionLine[];
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold>Running</Text>
      <TestingIdentitiesKitInkCommandPreview
        commandLine={props.npxCommandLineRedacted}
      />
      <TestingIdentitiesKitInkCapturedOutputBlock
        title="Output"
        lines={props.sessionLines}
        maxLines={20}
        bracketSource
      />
    </Box>
  );
}

/**
 * Renders the terminal task outcome, captured output, and parsed JSON summary when available.
 */
function TestingIdentitiesInkResultPanel(props: {
  sessionDone: TestingIdentitiesInk_SessionDoneSummary;
  sessionLines: TestingIdentitiesKit_InkSessionLine[];
  parsedSummary: string | null;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text
        bold
        color={props.sessionDone.status === "succeeded" ? "green" : "red"}
      >
        {props.sessionDone.status === "succeeded"
          ? "Completed"
          : props.sessionDone.status === "cancelled"
            ? "Cancelled"
            : "Failed"}
        {props.sessionDone.exitCode === null
          ? ""
          : ` (exit ${String(props.sessionDone.exitCode)})`}
      </Text>
      <TestingIdentitiesKitInkCapturedOutputBlock
        title="Captured output"
        lines={props.sessionLines}
        maxLines={24}
        bracketSource
      />
      {props.parsedSummary ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Parsed JSON summary</Text>
          <Text>{props.parsedSummary}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

/**
 * Ink renderer for the testing-identities workflow wizard, previews, and spawned runs.
 *
 * @remarks
 * I/O: launches child processes through the shared Ink task bridge and streams stdout/stderr into UI state.
 */
export function TestingIdentitiesKitInkApp({
  config,
}: {
  config: TestingIdentitiesKit_UiConfig;
}) {
  const { repoRoot, workflows } = config;
  const { exit } = useApp();
  const [step, setStep] = useState<InkStep>("workflow");
  const [workflowIndex, setWorkflowIndex] = useState(0);
  const [sessionNonce, setSessionNonce] = useState(0);
  const [formSlot, setFormSlot] = useState(0);

  const [allocatePurpose, setAllocatePurpose] = useState("");
  const [allocateRunId, setAllocateRunId] = useState("");
  const [ensureEmail, setEnsureEmail] = useState("");
  const [ensurePassword, setEnsurePassword] = useState("");
  const [ensureUserName, setEnsureUserName] = useState("");
  const [ensureWebsiteUrl, setEnsureWebsiteUrl] = useState("");
  const [ensureAllowReal, setEnsureAllowReal] = useState(false);
  const [applicantActorToken, setApplicantActorToken] = useState("");
  const [applicantSource, setApplicantSource] = useState("");
  const [applicantApiUrl, setApplicantApiUrl] = useState("");
  const [applicantPassword, setApplicantPassword] = useState("");
  const [applicantUserName, setApplicantUserName] = useState("");
  const [applicantAllowReal, setApplicantAllowReal] = useState(false);
  const [fixtureStrict, setFixtureStrict] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastAllocatedEmail, setLastAllocatedEmail] = useState<string | null>(
    null,
  );

  const [sessionLines, setSessionLines] = useState<
    TestingIdentitiesKit_InkSessionLine[]
  >([]);
  const [sessionDone, setSessionDone] =
    useState<TestingIdentitiesInk_SessionDoneSummary | null>(null);
  const [runCancel, setRunCancel] = useState<(() => void) | null>(null);
  const [parsedSummary, setParsedSummary] = useState<string | null>(null);

  const workflowId = workflowIdAtIndex({ index: workflowIndex, workflows });
  const formSlotMax = useMemo(
    () => testingIdentitiesInk_resolveFormSlotMax(workflowId),
    [workflowId],
  );

  const formFields = useMemo(
    () => ({
      allocatePurpose,
      allocateRunId,
      ensureEmail,
      ensurePassword,
      ensureUserName,
      ensureWebsiteUrl,
      ensureAllowReal,
      applicantActorToken,
      applicantSource,
      applicantApiUrl,
      applicantPassword,
      applicantUserName,
      applicantAllowReal,
      fixtureStrict,
    }),
    [
      allocatePurpose,
      allocateRunId,
      ensureEmail,
      ensurePassword,
      ensureUserName,
      ensureWebsiteUrl,
      ensureAllowReal,
      applicantActorToken,
      applicantSource,
      applicantApiUrl,
      applicantPassword,
      applicantUserName,
      applicantAllowReal,
      fixtureStrict,
    ],
  );

  const argvInput = useMemo(
    () =>
      TestingIdentitiesKit_formFieldsToArgvInput({
        workflowId: workflowIdAtIndex({ index: workflowIndex, workflows }),
        fields: formFields,
      }),
    [workflowIndex, workflows, formFields],
  );

  const previewLinesRedacted = useMemo(
    () =>
      TestingIdentitiesKit_formatCommandPreviewLines({
        input: argvInput,
        redacted: true,
        workflows,
      }),
    [argvInput, workflows],
  );

  const spawnArgv = useMemo(
    () => TestingIdentitiesKit_buildArgv(argvInput),
    [argvInput],
  );

  const scriptAbs = useMemo(
    () =>
      TestingIdentitiesKit_scriptAbsolutePath({
        projectRoot: repoRoot,
        workflow: argvInput.workflow,
        workflows,
      }),
    [repoRoot, argvInput.workflow, workflows],
  );

  const npxCommandLineRedacted = useMemo(() => {
    const red = TestingIdentitiesKit_buildArgvRedactedForDisplay(argvInput);
    return TestingIdentitiesKit_formatCommandLine("npx", [
      "tsx",
      scriptAbs,
      ...red,
    ]);
  }, [scriptAbs, argvInput]);

  useEffect(() => {
    setFormSlot(0);
  }, [workflowIndex, step]);

  useEffect(() => {
    if (step !== "session") {
      return;
    }

    setSessionLines([]);
    setSessionDone(null);
    setParsedSummary(null);

    const argsSnapshot = [...spawnArgv];
    const scriptSnapshot = scriptAbs;

    const task = TestingIdentitiesKit_startInkCliTaskProcess({
      projectRoot: repoRoot,
      command: "npx",
      args: ["tsx", scriptSnapshot, ...argsSnapshot],
      callbacks: {
        onStarted: () => {},
        onLine: (line) => {
          setSessionLines((previous) => [...previous, line]);
        },
      },
    });

    setRunCancel(() => task.cancel);

    void task.promise.then((result) => {
      testingIdentitiesInk_finalizeSessionTask({
        result,
        argvWorkflow: argvInput.workflow,
        setSessionDone,
        setRunCancel,
        setParsedSummary,
        setLastAllocatedEmail,
        setStep,
      });
    });

    return () => {
      task.cancel();
    };
  }, [step, sessionNonce, repoRoot, scriptAbs, spawnArgv, argvInput.workflow]);

  const goBack = useCallback(() => {
    if (step === "session") {
      return;
    }
    if (step === "result") {
      setStep("review");
      setSessionDone(null);
      setParsedSummary(null);
      return;
    }
    if (step === "review") {
      setStep("form");
      return;
    }
    if (step === "form") {
      setStep("workflow");
      setFormError(null);
      return;
    }
    exit();
  }, [step, exit]);

  const goNextFromForm = useCallback(() => {
    const err = TestingIdentitiesKit_validateEmailWorkflow({
      workflowId: workflowIdAtIndex({ index: workflowIndex, workflows }),
      email: ensureEmail,
    });
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setStep("review");
  }, [workflowIndex, workflows, ensureEmail]);

  useInput((input, key) => {
    testingIdentitiesInk_dispatchInput({
      input,
      key,
      step,
      workflowIndex,
      workflows,
      formSlot,
      formSlotMax,
      lastAllocatedEmail,
      runCancel,
      exit,
      goBack,
      goNextFromForm,
      setSessionNonce,
      setStep,
      setSessionDone,
      setParsedSummary,
      setEnsureEmail,
      setWorkflowIndex,
      setFormSlot,
      setFixtureStrict,
      setAllocatePurpose,
      setAllocateRunId,
      setEnsurePassword,
      setEnsureUserName,
      setEnsureWebsiteUrl,
      setEnsureAllowReal,
      setApplicantActorToken,
      setApplicantSource,
      setApplicantApiUrl,
      setApplicantPassword,
      setApplicantUserName,
      setApplicantAllowReal,
    });
  });

  const legend = testingIdentitiesInk_legendLines({
    step,
    workflowId,
    lastAllocatedEmail,
  });

  return (
    <Box flexDirection="column">
      <TestingIdentitiesKitInkScreenHeader
        appName="Testing identities (Ink)"
        description="Interactive wrapper for configured testing-identity workflows."
        summary={<Text>Step: {step}</Text>}
      />

      {step === "workflow" ? (
        <TestingIdentitiesInkWorkflowPanel
          workflowIndex={workflowIndex}
          workflows={workflows}
        />
      ) : null}

      {step === "form" ? (
        <TestingIdentitiesInkFormPanel
          workflowIndex={workflowIndex}
          workflows={workflows}
          workflowId={workflowId}
          formError={formError}
          formSlot={formSlot}
          allocatePurpose={allocatePurpose}
          allocateRunId={allocateRunId}
          ensureEmail={ensureEmail}
          ensurePassword={ensurePassword}
          ensureUserName={ensureUserName}
          ensureWebsiteUrl={ensureWebsiteUrl}
          ensureAllowReal={ensureAllowReal}
          applicantActorToken={applicantActorToken}
          applicantSource={applicantSource}
          applicantApiUrl={applicantApiUrl}
          applicantPassword={applicantPassword}
          applicantUserName={applicantUserName}
          applicantAllowReal={applicantAllowReal}
          fixtureStrict={fixtureStrict}
        />
      ) : null}

      {step === "review" ? (
        <TestingIdentitiesInkReviewPanel
          previewLinesRedacted={previewLinesRedacted}
          npxCommandLineRedacted={npxCommandLineRedacted}
        />
      ) : null}

      {step === "session" ? (
        <TestingIdentitiesInkSessionPanel
          npxCommandLineRedacted={npxCommandLineRedacted}
          sessionLines={sessionLines}
        />
      ) : null}

      {step === "result" && sessionDone ? (
        <TestingIdentitiesInkResultPanel
          sessionDone={sessionDone}
          sessionLines={sessionLines}
          parsedSummary={parsedSummary}
        />
      ) : null}

      <TestingIdentitiesKitInkLegend lines={legend} />
    </Box>
  );
}
