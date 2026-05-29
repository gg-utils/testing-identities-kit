/**
 * @fileoverview Covers the OpenTUI tsx-spawn helper and its cancel behavior.
 *
 * These Node test cases verify the child-process lifecycle used by the package-owned OpenTUI runner.
 *
 * Flow: spawn inputs -> child process/session handle -> cancel callback and exit handling.
 *
 * @testing Node unit: npm run testing-identities-kit:test
 * @see packages/testing-identities-kit/src/spawn-npx-tsx.ts - Helper under test.
 * @see packages/testing-identities-kit/src/opentui-app.tsx - Consumes the spawned session.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";

import {
  TestingIdentitiesKit_spawnNpxTsx,
  type TestingIdentitiesKit_ChildProcessSession,
  type TestingIdentitiesKit_SpawnFn,
} from "./spawn-npx-tsx.js";

/** Minimal child-process test double for cancellation assertions. */
class FakeChild
  extends EventEmitter
  implements TestingIdentitiesKit_ChildProcessSession
{
  readonly stdout = new EventEmitter();
  readonly stderr = new EventEmitter();
  killed = false;
  readonly signals: NodeJS.Signals[] = [];

  kill(signal: NodeJS.Signals): boolean {
    this.signals.push(signal);
    if (!this.killed) {
      this.killed = true;
      queueMicrotask(() => {
        this.emit("close", null);
      });
    }
    return true;
  }
}

describe("TestingIdentitiesKit_spawnNpxTsx", () => {
  it("cancel invokes kill on the spawned child", async () => {
    const fakeChild = new FakeChild();
    const spawnCalls: Array<{ argv: readonly string[]; command: string }> = [];
    const spawnImpl: TestingIdentitiesKit_SpawnFn = (command, argv) => {
      spawnCalls.push({ argv, command });
      return fakeChild;
    };

    const { cancel, promise } = TestingIdentitiesKit_spawnNpxTsx({
      repoRoot: "/repo",
      scriptPathUnderRepo: "tooling/testing-identities/allocate-user.ts",
      argv: [],
      spawnImpl,
    });

    cancel();
    const result = await promise;
    assert.deepEqual(fakeChild.signals, ["SIGTERM"]);
    assert.equal(result.status, 1);
    assert.equal(spawnCalls[0]?.command, "npx");
    assert.deepEqual(spawnCalls[0]?.argv, [
      "tsx",
      "/repo/tooling/testing-identities/allocate-user.ts",
    ]);
  });
});
