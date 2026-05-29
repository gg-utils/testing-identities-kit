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

/** Event handlers for testing-identities tsx spawn stdout/stderr streaming. */
export type TestingIdentitiesKit_SpawnHandlers = {
  onStderrChunk?: (chunk: string) => void;
  onStdoutChunk?: (chunk: string) => void;
};

/** Minimal readable event source used by the spawn bridge. */
export interface TestingIdentitiesKit_ReadableEventSource {
  on(eventName: "data", listener: (chunk: Buffer | string) => void): this;
}

/** Minimal child-process contract needed by cancel, stream, and completion handling. */
export interface TestingIdentitiesKit_ChildProcessSession {
  readonly stderr?: TestingIdentitiesKit_ReadableEventSource | null;
  readonly stdout?: TestingIdentitiesKit_ReadableEventSource | null;
  readonly killed: boolean;
  kill(signal: NodeJS.Signals): boolean;
  on(eventName: "close", listener: (code: number | null) => void): this;
  on(eventName: "error", listener: (error: Error) => void): this;
}

/** Spawn options passed to injectable child-process factories. */
export interface TestingIdentitiesKit_SpawnOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdio: ["ignore", "pipe", "pipe"];
}

/** Injectable spawn signature for dependency injection and unit tests. */
export type TestingIdentitiesKit_SpawnFn = (
  command: string,
  argv: readonly string[],
  options: TestingIdentitiesKit_SpawnOptions,
) => TestingIdentitiesKit_ChildProcessSession;

/** Adapts Node's spawn overload to the package's narrow child-process contract. */
const TestingIdentitiesKit_defaultSpawn: TestingIdentitiesKit_SpawnFn = (
  command,
  argv,
  options,
) => spawn(command, [...argv], options);

/** Runs `npx tsx <scriptUnderRepo>` from `repoRoot` with streamed output and explicit cancellation. */
export function TestingIdentitiesKit_spawnNpxTsx(options: {
  repoRoot: string;
  scriptPathUnderRepo: string;
  argv: readonly string[];
  handlers?: TestingIdentitiesKit_SpawnHandlers;
  spawnImpl?: TestingIdentitiesKit_SpawnFn;
}): {
  cancel: () => void;
  child: TestingIdentitiesKit_ChildProcessSession;
  promise: Promise<{ status: number; stderr: string; stdout: string }>;
} {
  const spawnFn = options.spawnImpl ?? TestingIdentitiesKit_defaultSpawn;
  const scriptAbs = path.join(options.repoRoot, options.scriptPathUnderRepo);
  const child = spawnFn("npx", ["tsx", scriptAbs, ...options.argv], {
    cwd: options.repoRoot,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  const promise = new Promise<{
    status: number;
    stderr: string;
    stdout: string;
  }>((resolve, reject) => {
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
  const cancel = (): void => {
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
