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
export type TestingIdentitiesKit_SpawnFn = (command: string, argv: readonly string[], options: TestingIdentitiesKit_SpawnOptions) => TestingIdentitiesKit_ChildProcessSession;
/** Runs `npx tsx <scriptUnderRepo>` from `repoRoot` with streamed output and explicit cancellation. */
export declare function TestingIdentitiesKit_spawnNpxTsx(options: {
    repoRoot: string;
    scriptPathUnderRepo: string;
    argv: readonly string[];
    handlers?: TestingIdentitiesKit_SpawnHandlers;
    spawnImpl?: TestingIdentitiesKit_SpawnFn;
}): {
    cancel: () => void;
    child: TestingIdentitiesKit_ChildProcessSession;
    promise: Promise<{
        status: number;
        stderr: string;
        stdout: string;
    }>;
};
//# sourceMappingURL=spawn-npx-tsx.d.ts.map