/** @jsxImportSource @gg-utils/testing-identities-kit/opentui-runtime */
/**
 * @fileoverview Renders the package-owned OpenTUI workflow panel, preview, and session panes.
 *
 * Reusable OpenTUI state, form handling, command previews, spawned-session tracking, and result
 * parsing live here. Host workspaces inject repo roots, workflow paths, npm script names, and
 * side-effect-compatible workflow definitions through `TestingIdentitiesKit_UiConfig`.
 *
 * @testing CLI manual: run the host OpenTUI adapter with `--help`, then verify workflow selection.
 * @see packages/testing-identities-kit/src/format-preview.ts - Supplies command preview strings.
 * @see packages/testing-identities-kit/src/spawn-npx-tsx.ts - Spawns configured workflow sessions.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { TestingIdentitiesKit_buildArgv } from "./build-argv.js";
import type {
  TestingIdentitiesKit_FormFields,
  TestingIdentitiesKit_UiConfig,
  TestingIdentitiesKit_WorkflowDefinition,
  TestingIdentitiesKit_WorkflowId,
} from "./contracts.js";
import {
  TestingIdentitiesKit_formFieldsToArgvInput,
  TestingIdentitiesKit_validateEmailWorkflow,
} from "./form-to-argv.js";
import { TestingIdentitiesKit_formatCommandPreviewLines } from "./format-preview.js";
import { TestingIdentitiesKit_parseLastJsonObject } from "./parse-stdout-json.js";
import { TestingIdentitiesKit_spawnNpxTsx } from "./spawn-npx-tsx.js";
import { TestingIdentitiesKit_findWorkflow } from "./workflows.js";

/**
 * Discriminates which wizard pane and tab actions render in the OpenTUI flow.
 *
 * @remarks
 * Each value corresponds to a sequential step from workflow pick through streamed run completion.
 */
type Phase = "pickWorkflow" | "form" | "preview" | "running" | "result";

/**
 * Supplies the empty initial form snapshot used on mount and after an "Again" run reset.
 *
 * @remarks
 * Every workflow field is present so UI handlers can spread partial updates over a stable shape.
 */
const defaultFields = (): TestingIdentitiesKit_FormFields => ({
  allocatePurpose: "",
  allocateRunId: "",
  ensureEmail: "",
  ensurePassword: "",
  ensureUserName: "",
  ensureWebsiteUrl: "",
  ensureAllowReal: false,
  applicantActorToken: "",
  applicantSource: "",
  applicantApiUrl: "",
  applicantPassword: "",
  applicantUserName: "",
  applicantAllowReal: false,
  fixtureStrict: false,
});

/** Builds the result-step actions while keeping the optional allocated-email action explicit. */
const resultActionOptions = (lastAllocatedEmail: string | null) => {
  const options = [{ description: "New run", name: "Again", value: "again" }];

  if (lastAllocatedEmail) {
    options.push({
      description: "Prefill ensure-auth email",
      name: "Use allocated email",
      value: "useEmail",
    });
  }

  options.push({ description: "Exit", name: "Quit", value: "quit" });
  return options;
};

/**
 * Narrows an OpenTUI option payload to a catalog workflow id when it matches `workflows`.
 */
function testingIdentitiesOpenTui_coerceWorkflowId(options: {
  raw: unknown;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
}): TestingIdentitiesKit_WorkflowId | null {
  if (typeof options.raw !== "string") {
    return null;
  }
  const hit = options.workflows.find((w) => w.id === options.raw);
  return hit ? hit.id : null;
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

/** Props for {@link TestingIdentitiesOpenTuiPickWorkflowPanel}. */
type TestingIdentitiesOpenTuiPickWorkflowPanelProps = {
  workflowOptions: ReadonlyArray<{
    description: string;
    name: string;
    value: string;
  }>;
  workflowSelectIndex: number;
  setWorkflowSelectIndex: Dispatch<SetStateAction<number>>;
  setWorkflowId: Dispatch<SetStateAction<TestingIdentitiesKit_WorkflowId>>;
  setPhase: Dispatch<SetStateAction<Phase>>;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
};

/**
 * Renders workflow selection plus Continue/Quit navigation for the pick-workflow step.
 */
function TestingIdentitiesOpenTuiPickWorkflowPanel(
  props: TestingIdentitiesOpenTuiPickWorkflowPanelProps,
) {
  const {
    workflowOptions,
    workflowSelectIndex,
    setWorkflowSelectIndex,
    setWorkflowId,
    setPhase,
    workflows,
  } = props;

  return (
    <>
      <text bold>Workflow</text>
      <select
        onChange={(index, option) => {
          setWorkflowSelectIndex(index);
          const nextId = testingIdentitiesOpenTui_coerceWorkflowId({
            raw: option?.value,
            workflows,
          });
          if (nextId) {
            setWorkflowId(nextId);
          }
        }}
        options={workflowOptions}
        selectedIndex={workflowSelectIndex}
        showDescription={false}
      />
      <tab-select
        onSelect={(_i, option) => {
          const v = option?.value;
          if (v === "continue") {
            setPhase("form");
          } else if (v === "quit") {
            process.kill(process.pid, "SIGINT");
          }
        }}
        options={[
          {
            description: "Edit parameters",
            name: "Continue",
            value: "continue",
          },
          { description: "Exit", name: "Quit", value: "quit" },
        ]}
        showDescription={true}
      />
    </>
  );
}

/** Props for {@link TestingIdentitiesOpenTuiFormPanel}. */
type TestingIdentitiesOpenTuiFormPanelProps = {
  workflowId: TestingIdentitiesKit_WorkflowId;
  fields: TestingIdentitiesKit_FormFields;
  setFields: Dispatch<SetStateAction<TestingIdentitiesKit_FormFields>>;
  formError: string;
  goPreview: () => void;
  setPhase: Dispatch<SetStateAction<Phase>>;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
};

/**
 * Renders workflow-specific form inputs plus Preview/Back navigation for the form step.
 */
function TestingIdentitiesOpenTuiFormPanel(
  props: TestingIdentitiesOpenTuiFormPanelProps,
) {
  const {
    workflowId,
    fields,
    setFields,
    formError,
    goPreview,
    setPhase,
    workflows,
  } = props;

  return (
    <>
      {formError.length > 0 ? <text>{formError}</text> : null}
      <scrollbox style={{ flexGrow: 1 }}>
        <box style={{ flexDirection: "column", gap: 1 }}>
          <text>
            Workflow:{" "}
            {
              TestingIdentitiesKit_findWorkflow({
                id: workflowId,
                workflows,
              }).label
            }
          </text>

          {workflowId === "allocate" ? (
            <>
              <text>Purpose (--purpose)</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, allocatePurpose: value }))
                }
                value={fields.allocatePurpose}
              />
              <text>Run id (--run-id)</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, allocateRunId: value }))
                }
                value={fields.allocateRunId}
              />
            </>
          ) : null}

          {workflowId === "ensureAuth" || workflowId === "ensureApplicant" ? (
            <>
              <text>Email (--email)</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, ensureEmail: value }))
                }
                value={fields.ensureEmail}
              />
            </>
          ) : null}

          {workflowId === "ensureAuth" ? (
            <>
              <text>Password</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, ensurePassword: value }))
                }
                value={fields.ensurePassword}
              />
              <text>User name</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, ensureUserName: value }))
                }
                value={fields.ensureUserName}
              />
              <text>Website URL</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, ensureWebsiteUrl: value }))
                }
                value={fields.ensureWebsiteUrl}
              />
              <text>Allow real email (type yes/no)</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({
                    ...f,
                    ensureAllowReal: value.toLowerCase() === "yes",
                  }))
                }
                value={fields.ensureAllowReal ? "yes" : "no"}
              />
            </>
          ) : null}

          {workflowId === "ensureApplicant" ? (
            <>
              <text>Actor user token</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, applicantActorToken: value }))
                }
                value={fields.applicantActorToken}
              />
              <text>Source</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, applicantSource: value }))
                }
                value={fields.applicantSource}
              />
              <text>API URL</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, applicantApiUrl: value }))
                }
                value={fields.applicantApiUrl}
              />
              <text>Password (if resolving actor via auth)</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, applicantPassword: value }))
                }
                value={fields.applicantPassword}
              />
              <text>User name</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({ ...f, applicantUserName: value }))
                }
                value={fields.applicantUserName}
              />
              <text>Allow real email (yes/no)</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({
                    ...f,
                    applicantAllowReal: value.toLowerCase() === "yes",
                  }))
                }
                value={fields.applicantAllowReal ? "yes" : "no"}
              />
            </>
          ) : null}

          {workflowId === "fixtureHygiene" ? (
            <>
              <text>Strict mode (--strict): type yes or no</text>
              <input
                onChange={(value) =>
                  setFields((f) => ({
                    ...f,
                    fixtureStrict: value.toLowerCase() === "yes",
                  }))
                }
                value={fields.fixtureStrict ? "yes" : "no"}
              />
            </>
          ) : null}
        </box>
      </scrollbox>
      <tab-select
        onSelect={(_i, option) => {
          const v = option?.value;
          if (v === "preview") {
            goPreview();
          } else if (v === "back") {
            setPhase("pickWorkflow");
          }
        }}
        options={[
          {
            description: "Review redacted command",
            name: "Preview",
            value: "preview",
          },
          { description: "Change workflow", name: "Back", value: "back" },
        ]}
        showDescription={true}
      />
    </>
  );
}

/** Props for {@link TestingIdentitiesOpenTuiPreviewPanel}. */
type TestingIdentitiesOpenTuiPreviewPanelProps = {
  previewText: string;
  runSpawn: () => Promise<void>;
  setPhase: Dispatch<SetStateAction<Phase>>;
};

/** Renders the redacted argv preview plus Run/Back navigation for the preview step. */
function TestingIdentitiesOpenTuiPreviewPanel(
  props: TestingIdentitiesOpenTuiPreviewPanelProps,
) {
  const { previewText, runSpawn, setPhase } = props;

  return (
    <>
      <text bold>Preview (redacted)</text>
      <scrollbox style={{ flexGrow: 1 }}>
        <text>{previewText}</text>
      </scrollbox>
      <text style={{ fg: "gray" }}>
        Spawn uses real argv on Run; preview above is redacted for display only.
      </text>
      <tab-select
        onSelect={(_i, option) => {
          const v = option?.value;
          if (v === "run") {
            void runSpawn();
          } else if (v === "back") {
            setPhase("form");
          }
        }}
        options={[
          { description: "Run canonical script", name: "Run", value: "run" },
          { description: "Edit form", name: "Back", value: "back" },
        ]}
        showDescription={true}
      />
    </>
  );
}

/** Props for {@link TestingIdentitiesOpenTuiRunningPanel}. */
type TestingIdentitiesOpenTuiRunningPanelProps = {
  runStdout: string;
  runStderr: string;
  activeRun: MutableRefObject<{ cancel: () => void } | null>;
};

/** Renders streamed stdout/stderr plus cancel controls while a workflow child is running. */
function TestingIdentitiesOpenTuiRunningPanel(
  props: TestingIdentitiesOpenTuiRunningPanelProps,
) {
  const { runStdout, runStderr, activeRun } = props;

  return (
    <>
      <text bold>Running…</text>
      <scrollbox style={{ flexGrow: 1, maxHeight: 14 }}>
        <text>{runStdout.length > 0 ? runStdout : "(streaming stdout)"}</text>
      </scrollbox>
      <text>{runStderr.length > 0 ? `stderr: ${runStderr}` : ""}</text>
      <tab-select
        onSelect={(_i, option) => {
          if (option?.value === "cancel") {
            activeRun.current?.cancel();
          }
        }}
        options={[
          {
            description: "SIGTERM child npx tsx",
            name: "Cancel",
            value: "cancel",
          },
        ]}
        showDescription={true}
      />
    </>
  );
}

/** Props for {@link TestingIdentitiesOpenTuiResultPanel}. */
type TestingIdentitiesOpenTuiResultPanelProps = {
  runStatus: number | null;
  lastAllocatedEmail: string | null;
  runStdout: string;
  runStderr: string;
  parsedSummary: string;
  setPhase: Dispatch<SetStateAction<Phase>>;
  setFields: Dispatch<SetStateAction<TestingIdentitiesKit_FormFields>>;
  setWorkflowId: Dispatch<SetStateAction<TestingIdentitiesKit_WorkflowId>>;
  setWorkflowSelectIndex: Dispatch<SetStateAction<number>>;
  workflows: readonly TestingIdentitiesKit_WorkflowDefinition[];
};

/** Renders the finished summary, optional parsed JSON, and Again/Quit/Use-email actions. */
function TestingIdentitiesOpenTuiResultPanel(
  props: TestingIdentitiesOpenTuiResultPanelProps,
) {
  const {
    runStatus,
    lastAllocatedEmail,
    runStdout,
    runStderr,
    parsedSummary,
    setPhase,
    setFields,
    setWorkflowId,
    setWorkflowSelectIndex,
    workflows,
  } = props;

  return (
    <>
      <text bold>
        Finished (exit {runStatus === null ? "?" : String(runStatus)})
        {lastAllocatedEmail ? ` | last allocated: ${lastAllocatedEmail}` : ""}
      </text>
      <scrollbox style={{ flexGrow: 1, maxHeight: 10 }}>
        <text>{runStdout.length > 0 ? runStdout : "(empty stdout)"}</text>
      </scrollbox>
      <text>{runStderr.length > 0 ? `stderr: ${runStderr}` : ""}</text>
      {parsedSummary.length > 0 ? (
        <scrollbox style={{ maxHeight: 8 }}>
          <text>{parsedSummary}</text>
        </scrollbox>
      ) : null}
      <tab-select
        onSelect={(_i, option) => {
          const v = option?.value;
          if (v === "again") {
            setPhase("pickWorkflow");
            setFields(defaultFields());
            setWorkflowSelectIndex(0);
            setWorkflowId("allocate");
          } else if (v === "quit") {
            process.kill(process.pid, "SIGINT");
          } else if (v === "useEmail" && lastAllocatedEmail) {
            setFields((f) => ({ ...f, ensureEmail: lastAllocatedEmail }));
            setWorkflowId("ensureAuth");
            setWorkflowSelectIndex(
              Math.max(
                0,
                workflows.findIndex((w) => w.id === "ensureAuth"),
              ),
            );
            setPhase("form");
          }
        }}
        options={resultActionOptions(lastAllocatedEmail)}
        showDescription={true}
      />
    </>
  );
}

/**
 * OpenTUI renderer for testing-identities workflow selection, previews, and spawned runs.
 *
 * @remarks
 * I/O: spawns `npx tsx` workflows via `TestingIdentitiesKit_spawnNpxTsx` and tracks cancellation through refs.
 */
export function TestingIdentitiesKitOpenTuiApp(props: {
  config: TestingIdentitiesKit_UiConfig;
}) {
  const { repoRoot, workflows } = props.config;
  const [phase, setPhase] = useState<Phase>("pickWorkflow");
  const [workflowId, setWorkflowId] =
    useState<TestingIdentitiesKit_WorkflowId>("allocate");
  const [workflowSelectIndex, setWorkflowSelectIndex] = useState(0);
  const [fields, setFields] = useState<TestingIdentitiesKit_FormFields>(() =>
    defaultFields(),
  );
  const [formError, setFormError] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [runStdout, setRunStdout] = useState("");
  const [runStderr, setRunStderr] = useState("");
  const [runStatus, setRunStatus] = useState<number | null>(null);
  const [parsedSummary, setParsedSummary] = useState("");
  const [lastAllocatedEmail, setLastAllocatedEmail] = useState<string | null>(
    null,
  );

  const activeRun = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    return () => {
      activeRun.current?.cancel();
    };
  }, []);

  const argvInput = useMemo(
    () => TestingIdentitiesKit_formFieldsToArgvInput({ workflowId, fields }),
    [workflowId, fields],
  );

  const refreshPreview = useCallback(() => {
    const lines = TestingIdentitiesKit_formatCommandPreviewLines({
      input: argvInput,
      redacted: true,
      workflows,
    });
    setPreviewText(lines.join("\n"));
  }, [argvInput, workflows]);

  const goPreview = useCallback(() => {
    const err = TestingIdentitiesKit_validateEmailWorkflow({
      workflowId,
      email: fields.ensureEmail,
    });
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    refreshPreview();
    setPhase("preview");
  }, [workflowId, fields.ensureEmail, refreshPreview]);

  const runSpawn = useCallback(async () => {
    activeRun.current?.cancel();
    setRunStdout("");
    setRunStderr("");
    setRunStatus(null);
    setParsedSummary("");
    setPhase("running");

    const def = TestingIdentitiesKit_findWorkflow({
      id: workflowId,
      workflows,
    });
    const argv = TestingIdentitiesKit_buildArgv(argvInput);
    const { cancel, promise } = TestingIdentitiesKit_spawnNpxTsx({
      repoRoot,
      scriptPathUnderRepo: def.scriptPathUnderRepo,
      argv,
      handlers: {
        onStdoutChunk: (chunk) => {
          setRunStdout((p) => p + chunk);
        },
        onStderrChunk: (chunk) => {
          setRunStderr((p) => p + chunk);
        },
      },
    });
    activeRun.current = { cancel };

    try {
      const result = await promise;
      setRunStatus(result.status);
      const parsed = TestingIdentitiesKit_parseLastJsonObject(result.stdout);
      if (parsed.ok && result.status === 0) {
        setParsedSummary(JSON.stringify(parsed.value, null, 2));
        if (workflowId === "allocate") {
          const allocationEmail = TestingIdentitiesKit_extractAllocationEmail(
            parsed.value,
          );
          if (allocationEmail !== null) {
            setLastAllocatedEmail(allocationEmail);
          }
        }
      } else {
        setParsedSummary("");
      }
    } catch {
      // Spawn bridge already streams stderr; a failed promise only needs to flip the result status.
      setRunStatus(1);
    } finally {
      activeRun.current = null;
      setPhase("result");
    }
  }, [argvInput, repoRoot, workflowId, workflows]);

  const workflowOptions = useMemo(
    () =>
      workflows.map((w) => ({
        description: w.label,
        name: w.label,
        value: w.id,
      })),
    [workflows],
  );

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, gap: 1, padding: 1 }}>
      <text>
        Configured testing-identities OpenTUI — host adapter supplies workflow
        paths and command aliases.
      </text>

      {phase === "pickWorkflow" ? (
        <TestingIdentitiesOpenTuiPickWorkflowPanel
          setPhase={setPhase}
          setWorkflowId={setWorkflowId}
          setWorkflowSelectIndex={setWorkflowSelectIndex}
          workflowOptions={workflowOptions}
          workflowSelectIndex={workflowSelectIndex}
          workflows={workflows}
        />
      ) : null}

      {phase === "form" ? (
        <TestingIdentitiesOpenTuiFormPanel
          fields={fields}
          formError={formError}
          goPreview={goPreview}
          setFields={setFields}
          setPhase={setPhase}
          workflowId={workflowId}
          workflows={workflows}
        />
      ) : null}

      {phase === "preview" ? (
        <TestingIdentitiesOpenTuiPreviewPanel
          previewText={previewText}
          runSpawn={runSpawn}
          setPhase={setPhase}
        />
      ) : null}

      {phase === "running" ? (
        <TestingIdentitiesOpenTuiRunningPanel
          activeRun={activeRun}
          runStderr={runStderr}
          runStdout={runStdout}
        />
      ) : null}

      {phase === "result" ? (
        <TestingIdentitiesOpenTuiResultPanel
          lastAllocatedEmail={lastAllocatedEmail}
          parsedSummary={parsedSummary}
          runStderr={runStderr}
          runStdout={runStdout}
          runStatus={runStatus}
          setFields={setFields}
          setPhase={setPhase}
          setWorkflowId={setWorkflowId}
          setWorkflowSelectIndex={setWorkflowSelectIndex}
          workflows={workflows}
        />
      ) : null}
    </box>
  );
}
