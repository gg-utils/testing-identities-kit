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
import { spawn } from "node:child_process";
/** Wraps emitted text with its originating stream channel. */
function TestingIdentitiesKit_createInkSessionLine(source, text) {
    return { source, text };
}
/** Appends newline-terminated chunks and keeps any trailing partial line buffered. */
function TestingIdentitiesKit_appendInkChunkLines(options) {
    let buffer = options.existingBuffer + options.chunk;
    while (true) {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) {
            break;
        }
        const rawLine = buffer.slice(0, newlineIndex).replace(/\r$/, "");
        buffer = buffer.slice(newlineIndex + 1);
        const line = TestingIdentitiesKit_createInkSessionLine(options.source, rawLine);
        options.lines.push(line);
        options.emitLine(line);
    }
    return buffer;
}
/** Emits one final line after stream close when a buffer still holds text. */
function TestingIdentitiesKit_flushBufferedInkLine(options) {
    const trimmed = options.buffer.replace(/\r$/, "");
    if (trimmed.length === 0) {
        return;
    }
    const line = TestingIdentitiesKit_createInkSessionLine(options.source, trimmed);
    options.lines.push(line);
    options.emitLine(line);
}
/** Sends a signal to the child or its process group when available. */
function TestingIdentitiesKit_stopInkChildProcess(options) {
    try {
        if (options.useProcessGroup && typeof options.child.pid === "number") {
            process.kill(-options.child.pid, options.signal);
            return;
        }
        options.child.kill(options.signal);
    }
    catch (error) {
        const code = error instanceof Error && "code" in error ? String(error.code) : null;
        if (code === "ESRCH") {
            return;
        }
        throw error;
    }
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
export function TestingIdentitiesKit_startInkCliTaskProcess(options) {
    const spawnProcess = options.dependencies?.spawnProcess ?? spawn;
    const useProcessGroup = process.platform !== "win32";
    const child = spawnProcess(options.command, options.args, {
        cwd: options.projectRoot,
        env: options.env ?? process.env,
        detached: useProcessGroup,
        stdio: ["ignore", "pipe", "pipe"],
    });
    const lines = [];
    const startedAt = new Date().toISOString();
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let cancelled = false;
    let closed = false;
    let forceKillTimer = null;
    options.callbacks.onStarted(startedAt);
    const promise = new Promise((resolve, reject) => {
        child.stdout.on("data", (chunk) => {
            stdoutBuffer = TestingIdentitiesKit_appendInkChunkLines({
                source: "stdout",
                chunk: chunk.toString(),
                lines,
                emitLine: options.callbacks.onLine,
                existingBuffer: stdoutBuffer,
            });
        });
        child.stderr.on("data", (chunk) => {
            stderrBuffer = TestingIdentitiesKit_appendInkChunkLines({
                source: "stderr",
                chunk: chunk.toString(),
                lines,
                emitLine: options.callbacks.onLine,
                existingBuffer: stderrBuffer,
            });
        });
        child.once("error", (error) => {
            reject(error);
        });
        child.once("close", (exitCode, signal) => {
            closed = true;
            if (forceKillTimer) {
                clearTimeout(forceKillTimer);
            }
            TestingIdentitiesKit_flushBufferedInkLine({
                source: "stdout",
                buffer: stdoutBuffer,
                lines,
                emitLine: options.callbacks.onLine,
            });
            TestingIdentitiesKit_flushBufferedInkLine({
                source: "stderr",
                buffer: stderrBuffer,
                lines,
                emitLine: options.callbacks.onLine,
            });
            resolve({
                status: cancelled
                    ? "cancelled"
                    : exitCode === 0
                        ? "succeeded"
                        : "failed",
                exitCode,
                signal,
                lines,
                startedAt,
                endedAt: new Date().toISOString(),
            });
        });
    });
    const cancel = () => {
        if (closed || cancelled) {
            return;
        }
        cancelled = true;
        TestingIdentitiesKit_stopInkChildProcess({
            child,
            useProcessGroup,
            signal: "SIGTERM",
        });
        forceKillTimer = setTimeout(() => {
            if (!closed) {
                TestingIdentitiesKit_stopInkChildProcess({
                    child,
                    useProcessGroup,
                    signal: "SIGKILL",
                });
            }
        }, 2000);
        forceKillTimer.unref?.();
    };
    return { promise, cancel, lines, startedAt };
}
//# sourceMappingURL=ink-task.js.map