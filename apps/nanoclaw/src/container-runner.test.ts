import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

// Sentinel markers must match container-runner.ts
const OUTPUT_START_MARKER = '---NANOCLAW_OUTPUT_START---';
const OUTPUT_END_MARKER = '---NANOCLAW_OUTPUT_END---';

// Mock config
vi.mock('./config.js', () => ({
  CONTAINER_IMAGE: 'nanoclaw-agent:latest',
  CONTAINER_MAX_OUTPUT_SIZE: 10485760,
  CONTAINER_TIMEOUT: 1800000, // 30min
  DATA_DIR: '/tmp/nanoclaw-test-data',
  GROUPS_DIR: '/tmp/nanoclaw-test-groups',
  IDLE_TIMEOUT: 1800000, // 30min
  ONECLI_URL: 'http://localhost:10254',
  TIMEZONE: 'America/Los_Angeles',
  MONOREPO_PATH: '',
  WORKTREE_BASE: '/tmp/nanoclaw-test-worktrees',
  EXT_REPOS_BASE: '/tmp/nanoclaw-test-ext-repos',
}));

// Mock workspace-config — default to monorepo mode (no workspace.json)
vi.mock('./workspace-config.js', () => ({
  loadWorkspaceConfig: vi.fn(() => null),
  cloneExternalRepo: vi.fn(async () => '/tmp/nanoclaw-test-ext-repos/test-repo-123'),
  isExclusive: vi.fn((c: unknown) => (c as { mode?: string } | null)?.mode === 'exclusive'),
}));

// Mock logger
vi.mock('./logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => false),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn(() => ''),
      readdirSync: vi.fn(() => []),
      statSync: vi.fn(() => ({ isDirectory: () => false })),
      copyFileSync: vi.fn(),
    },
  };
});

// Mock mount-security
vi.mock('./mount-security.js', () => ({
  validateAdditionalMounts: vi.fn(() => []),
}));

// Mock container-runtime
vi.mock('./container-runtime.js', () => ({
  CONTAINER_RUNTIME_BIN: 'docker',
  hostGatewayArgs: () => [],
  readonlyMountArgs: (h: string, c: string) => ['-v', `${h}:${c}:ro`],
  stopContainer: vi.fn(),
}));

// Mock OneCLI SDK
vi.mock('@onecli-sh/sdk', () => ({
  OneCLI: class {
    applyContainerConfig = vi.fn().mockResolvedValue(true);
    createAgent = vi.fn().mockResolvedValue({ id: 'test' });
    ensureAgent = vi
      .fn()
      .mockResolvedValue({ name: 'test', identifier: 'test', created: true });
  },
}));

// Create a controllable fake ChildProcess
function createFakeProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
    pid: number;
  };
  proc.stdin = new PassThrough();
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();
  proc.kill = vi.fn();
  proc.pid = 12345;
  return proc;
}

let fakeProc: ReturnType<typeof createFakeProcess>;

// Mock child_process.spawn
vi.mock('child_process', async () => {
  const actual =
    await vi.importActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    spawn: vi.fn(() => fakeProc),
    exec: vi.fn(
      (_cmd: string, _opts: unknown, cb?: (err: Error | null) => void) => {
        if (cb) cb(null);
        return new EventEmitter();
      },
    ),
  };
});

import { runContainerAgent, ContainerOutput } from './container-runner.js';
import type { RegisteredGroup } from './types.js';

const testGroup: RegisteredGroup = {
  name: 'Test Group',
  folder: 'test-group',
  trigger: '@Andy',
  added_at: new Date().toISOString(),
};

const testInput = {
  prompt: 'Hello',
  groupFolder: 'test-group',
  chatJid: 'test@g.us',
  isMain: false,
};

function emitOutputMarker(
  proc: ReturnType<typeof createFakeProcess>,
  output: ContainerOutput,
) {
  const json = JSON.stringify(output);
  proc.stdout.push(`${OUTPUT_START_MARKER}\n${json}\n${OUTPUT_END_MARKER}\n`);
}

describe('container-runner timeout behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakeProc = createFakeProcess();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('timeout after output resolves as success', async () => {
    const onOutput = vi.fn(async () => {});
    const resultPromise = runContainerAgent(
      testGroup,
      testInput,
      () => {},
      onOutput,
    );

    // Emit output with a result
    emitOutputMarker(fakeProc, {
      status: 'success',
      result: 'Here is my response',
      newSessionId: 'session-123',
    });

    // Let output processing settle
    await vi.advanceTimersByTimeAsync(10);

    // Fire the hard timeout (IDLE_TIMEOUT + 30s = 1830000ms)
    await vi.advanceTimersByTimeAsync(1830000);

    // Emit close event (as if container was stopped by the timeout)
    fakeProc.emit('close', 137);

    // Let the promise resolve
    await vi.advanceTimersByTimeAsync(10);

    const result = await resultPromise;
    expect(result.status).toBe('success');
    expect(result.newSessionId).toBe('session-123');
    expect(onOutput).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'Here is my response' }),
    );
  });

  it('timeout with no output resolves as error', async () => {
    const onOutput = vi.fn(async () => {});
    const resultPromise = runContainerAgent(
      testGroup,
      testInput,
      () => {},
      onOutput,
    );

    // No output emitted — fire the hard timeout
    await vi.advanceTimersByTimeAsync(1830000);

    // Emit close event
    fakeProc.emit('close', 137);

    await vi.advanceTimersByTimeAsync(10);

    const result = await resultPromise;
    expect(result.status).toBe('error');
    expect(result.error).toContain('timed out');
    expect(onOutput).not.toHaveBeenCalled();
  });

  it('normal exit after output resolves as success', async () => {
    const onOutput = vi.fn(async () => {});
    const resultPromise = runContainerAgent(
      testGroup,
      testInput,
      () => {},
      onOutput,
    );

    // Emit output
    emitOutputMarker(fakeProc, {
      status: 'success',
      result: 'Done',
      newSessionId: 'session-456',
    });

    await vi.advanceTimersByTimeAsync(10);

    // Normal exit (no timeout)
    fakeProc.emit('close', 0);

    await vi.advanceTimersByTimeAsync(10);

    const result = await resultPromise;
    expect(result.status).toBe('success');
    expect(result.newSessionId).toBe('session-456');
  });
});

// ─── Workspace mode — mount configuration ────────────────────────────────────

import { spawn } from 'child_process';
import { loadWorkspaceConfig, cloneExternalRepo, isExclusive } from './workspace-config.js';

/**
 * Helper: run a container and capture the args passed to spawn().
 * Returns immediately after spawn is called (before container output).
 */
async function captureSpawnArgs(
  group: RegisteredGroup,
  isMainFlag: boolean,
): Promise<string[]> {
  const mockSpawnFn = vi.mocked(spawn);
  const resultPromise = runContainerAgent(
    group,
    { ...testInput, isMain: isMainFlag },
    () => {},
  );

  // Give async setup (loadWorkspaceConfig / cloneExternalRepo) time to run
  await vi.advanceTimersByTimeAsync(5);

  // Emit output + close so the promise resolves
  emitOutputMarker(fakeProc, { status: 'success', result: 'ok' });
  await vi.advanceTimersByTimeAsync(5);
  fakeProc.emit('close', 0);
  await vi.advanceTimersByTimeAsync(5);
  await resultPromise;

  // Return the args array passed to spawn (second call arg)
  const calls = mockSpawnFn.mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall[1] as string[];
}

describe('workspace mode — monorepo (no workspace.json)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakeProc = createFakeProcess();
    // Default: no workspace.json → monorepo mode
    vi.mocked(loadWorkspaceConfig).mockReturnValue(null);
    vi.mocked(isExclusive).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not mount /workspace/extra/repo for monorepo mode', async () => {
    const args = await captureSpawnArgs(testGroup, false);
    const argsStr = args.join(' ');
    expect(argsStr).not.toContain('/workspace/extra/repo');
  });

  it('does not call cloneExternalRepo for monorepo mode', async () => {
    await captureSpawnArgs(testGroup, false);
    expect(cloneExternalRepo).not.toHaveBeenCalled();
  });
});

describe('workspace mode — exclusive', () => {
  const FAKE_TOKEN = 'ghp_fake_exclusive_token_xyz';
  const FAKE_CLONE_DIR = '/tmp/nanoclaw-test-ext-repos/org-mythos-123';

  beforeEach(() => {
    vi.useFakeTimers();
    fakeProc = createFakeProcess();

    // Exclusive workspace config
    vi.mocked(loadWorkspaceConfig).mockReturnValue({
      mode: 'exclusive',
      repo: 'org/mythos',
      branch: 'main',
      tokenEnvVar: 'GH_PAT_TOKEN_MYTHOS',
    });
    vi.mocked(isExclusive).mockReturnValue(true);
    vi.mocked(cloneExternalRepo).mockResolvedValue(FAKE_CLONE_DIR);

    // Inject the token into the process environment for this test
    process.env.GH_PAT_TOKEN_MYTHOS = FAKE_TOKEN;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete process.env.GH_PAT_TOKEN_MYTHOS;
  });

  it('mounts the cloned repo at /workspace/extra/repo', async () => {
    const args = await captureSpawnArgs(testGroup, false);
    const argsStr = args.join(' ');
    expect(argsStr).toContain(`${FAKE_CLONE_DIR}:/workspace/extra/repo`);
  });

  it('does NOT mount /workspace/extra/monorepo in exclusive mode', async () => {
    const args = await captureSpawnArgs(testGroup, false);
    const argsStr = args.join(' ');
    expect(argsStr).not.toContain('/workspace/extra/monorepo');
  });

  it('injects the exclusive token as GH_TOKEN, not the host GH_TOKEN', async () => {
    // Set a different host GH_TOKEN to ensure exclusive token takes precedence
    const originalHostToken = process.env.GH_TOKEN;
    process.env.GH_TOKEN = 'ghp_host_token_should_not_appear';

    const args = await captureSpawnArgs(testGroup, false);
    const argsStr = args.join(' ');

    expect(argsStr).toContain(`GH_TOKEN=${FAKE_TOKEN}`);
    expect(argsStr).not.toContain('ghp_host_token_should_not_appear');

    process.env.GH_TOKEN = originalHostToken;
  });

  it('calls cloneExternalRepo with the correct repo and branch', async () => {
    await captureSpawnArgs(testGroup, false);
    expect(cloneExternalRepo).toHaveBeenCalledWith(
      'org/mythos',
      'main',
      FAKE_TOKEN,
      expect.any(String),
    );
  });

  it('returns error when tokenEnvVar is not set on host', async () => {
    delete process.env.GH_PAT_TOKEN_MYTHOS;

    const result = await runContainerAgent(
      testGroup,
      { ...testInput, isMain: false },
      () => {},
    );

    expect(result.status).toBe('error');
    expect(result.error).toContain('GH_PAT_TOKEN_MYTHOS');
    expect(cloneExternalRepo).not.toHaveBeenCalled();
  });

  it('returns error when cloneExternalRepo fails', async () => {
    vi.mocked(cloneExternalRepo).mockRejectedValue(
      new Error('git clone failed: 128'),
    );

    const result = await runContainerAgent(
      testGroup,
      { ...testInput, isMain: false },
      () => {},
    );

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to clone');
  });
});

describe('workspace mode — exclusive does not apply to main group', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakeProc = createFakeProcess();
    // Even if workspace.json exists with exclusive mode, main containers skip it
    vi.mocked(loadWorkspaceConfig).mockReturnValue({
      mode: 'exclusive',
      repo: 'org/mythos',
      branch: 'main',
      tokenEnvVar: 'GH_PAT_TOKEN_MYTHOS',
    });
    vi.mocked(isExclusive).mockReturnValue(true);
    process.env.GH_PAT_TOKEN_MYTHOS = 'ghp_some_token';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete process.env.GH_PAT_TOKEN_MYTHOS;
  });

  it('does not clone or mount /workspace/extra/repo for the main group', async () => {
    const args = await captureSpawnArgs(testGroup, true);
    const argsStr = args.join(' ');
    // Main group: workspace config not read → no ext repo mount
    expect(argsStr).not.toContain('/workspace/extra/repo');
    expect(cloneExternalRepo).not.toHaveBeenCalled();
  });
});
