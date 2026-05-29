/**
 * @fileoverview Package-owned subprocess bridge that spawns workflow CLIs for the testing-identities
 * Ink shell and streams stdout/stderr into newline-delivered session lines.
 *
 * This file owns chunked line buffering, flush-on-close behavior, cancel signals (SIGTERM then an
 * optional SIGKILL grace timer on non-Windows process groups), and the typed execution result handed
 * to Ink reducers.
 * Flow: spawn child with piped stdio (or injected test double) -> split chunks on newlines -> emit
 * `TestingIdentitiesKit_InkSessionLine` via callbacks -> resolve `TestingIdentitiesKit_InkTaskExecutionResult` on `close`.
 *
 * @testing Node.js test runner unit: cd packages/testing-identities-kit && npm run test
 * @testing CLI manual: from repo root run `npm run identity:cli:ink` in a TTY, start a workflow command that streams logs, confirm newline-split stdout/stderr lines appear in the Ink log panel, then use Cancel and verify the child exits without leaving orphan process groups on POSIX hosts.
 *
 * @see packages/testing-identities-kit/src/ink-app.tsx - Interactive Ink wizard that calls `TestingIdentitiesKit_startInkCliTaskProcess` to attach workflow subprocess streams into reducer-driven UI state.
 * @see identity-workflows/ui/cli-ink/app.tsx - Bun Ink CLI adapter that renders `TestingIdentitiesKitInkApp`, exercising the end-to-end path that depends on this module for real subprocess streaming.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - Repository standard defining the audited file-overview tag order and metadata contract used in this module header.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
/** Source stream for a captured Ink output line. */
export type TestingIdentitiesKit_InkSessionLineSource = "stdout" | "stderr";
/** A single captured output line with its source stream. */
export interface TestingIdentitiesKit_InkSessionLine {
    source: TestingIdentitiesKit_InkSessionLineSource;
    text: string;
}
/** The final outcome of a spawned task. */
export interface TestingIdentitiesKit_InkTaskExecutionResult {
    status: "succeeded" | "failed" | "cancelled";
    exitCode: number | null;
    signal: string | null;
    lines: TestingIdentitiesKit_InkSessionLine[];
    startedAt: string;
    endedAt: string;
}
/** Child-process shape returned by the package Ink task bridge. */
type TestingIdentitiesKit_InkChildProcess = ChildProcessByStdio<null, Readable, Readable>;
/** Injectable child-process spawn surface for tests and host overrides. */
interface TestingIdentitiesKit_InkSpawnProcess {
    (command: string, args: string[], options: {
        cwd: string;
        env: NodeJS.ProcessEnv;
        detached: boolean;
        stdio: ["ignore", "pipe", "pipe"];
    }): TestingIdentitiesKit_InkChildProcess;
}
/** Side-channel hooks invoked as the subprocess starts and emits output lines. */
interface TestingIdentitiesKit_InkTaskCallbacks {
    onStarted: (startedAt: string) => void;
    onLine: (line: TestingIdentitiesKit_InkSessionLine) => void;
}
/**
 * Spawns a cancelable child CLI task and streams stdout/stderr into Ink-facing line callbacks.
 *
 * @remarks
 * I/O: runs `command` with piped stdio under `projectRoot`, converts chunk buffers to strings, splits
 * on `\n`, strips trailing `\r`, and forwards each completed line through `callbacks.onLine` while
 * mirroring into the returned `lines` array.
 * Cancel: marks the task cancelled, sends `SIGTERM` to the process or its POSIX process group when
 * detached, then escalates to `SIGKILL` after two seconds if `close` has not fired.
 * Testing: pass `dependencies.spawnProcess` to inject a fake child and assert buffering, cancellation,
 * and result resolution without shelling out to real CLIs.
 */
export declare function TestingIdentitiesKit_startInkCliTaskProcess(options: {
    projectRoot: string;
    command: string;
    args: string[];
    env?: NodeJS.ProcessEnv;
    callbacks: TestingIdentitiesKit_InkTaskCallbacks;
    dependencies?: {
        spawnProcess?: TestingIdentitiesKit_InkSpawnProcess;
    };
}): {
    promise: Promise<TestingIdentitiesKit_InkTaskExecutionResult>;
    cancel: () => void;
    lines: TestingIdentitiesKit_InkSessionLine[];
    startedAt: string;
};
export {};
//# sourceMappingURL=ink-task.d.ts.map