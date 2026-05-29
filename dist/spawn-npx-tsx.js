/**
 * @fileoverview Spawns cancelable npx tsx child processes for configured testing-identities run paths.
 *
 * This helper owns process creation and cancellation plumbing for the package-owned OpenTUI panel.
 *
 * Flow: repo-root script path + argv -> child process + cancel callback -> session output consumed by the UI.
 *
 * @example
 * ```typescript
 * const session = TestingIdentitiesKit_spawnNpxTsx({
 *   argv: ["--help"],
 *   scriptPathUnderRepo: "tooling/testing-identities/allocate-user.ts",
 *   spawn: spawnFn,
 * });
 * ```
 *
 * @testing Node unit: npm run testing-identities-kit:test
 * @see packages/testing-identities-kit/src/opentui-app.tsx - Consumes the cancelable child-session contract.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { spawn } from "node:child_process";
import path from "node:path";
/** Adapts Node's spawn overload to the package's narrow child-process contract. */
const TestingIdentitiesKit_defaultSpawn = (command, argv, options) => spawn(command, [...argv], options);
/** Runs `npx tsx <scriptUnderRepo>` from `repoRoot` with streamed output and explicit cancellation. */
export function TestingIdentitiesKit_spawnNpxTsx(options) {
    const spawnFn = options.spawnImpl ?? TestingIdentitiesKit_defaultSpawn;
    const scriptAbs = path.join(options.repoRoot, options.scriptPathUnderRepo);
    const child = spawnFn("npx", ["tsx", scriptAbs, ...options.argv], {
        cwd: options.repoRoot,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const promise = new Promise((resolve, reject) => {
        child.stdout?.on("data", (chunk) => {
            const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
            stdout += text;
            options.handlers?.onStdoutChunk?.(text);
        });
        child.stderr?.on("data", (chunk) => {
            const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
            stderr += text;
            options.handlers?.onStderrChunk?.(text);
        });
        child.on("error", (error) => {
            reject(error);
        });
        child.on("close", (code) => {
            resolve({
                status: code ?? 1,
                stderr,
                stdout,
            });
        });
    });
    /** Cancels the running tsx child: SIGTERM first, then SIGKILL after a short grace window. */
    const cancel = () => {
        if (child.killed) {
            return;
        }
        child.kill("SIGTERM");
        const killTimer = setTimeout(() => {
            if (!child.killed) {
                child.kill("SIGKILL");
            }
        }, 2000);
        killTimer.unref?.();
    };
    return { cancel, child, promise };
}
//# sourceMappingURL=spawn-npx-tsx.js.map