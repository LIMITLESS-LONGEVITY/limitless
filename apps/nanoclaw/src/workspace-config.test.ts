import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fs — individual tests control what readFileSync / existsSync return
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => false),
      readFileSync: vi.fn(() => ''),
      mkdirSync: vi.fn(),
    },
  };
});

// Mock config — use a stable test groups dir
vi.mock('./config.js', () => ({
  GROUPS_DIR: '/tmp/test-groups',
  EXT_REPOS_BASE: '/tmp/test-ext-repos',
}));

// Mock logger to suppress output
vi.mock('./logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock child_process.spawn for cloneExternalRepo tests
vi.mock('child_process', async () => {
  const actual =
    await vi.importActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import fs from 'fs';
import { spawn } from 'child_process';
import {
  cloneExternalRepo,
  isExclusive,
  loadWorkspaceConfig,
} from './workspace-config.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockWorkspaceFile(content: string): void {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(content);
}

function mockWorkspaceAbsent(): void {
  vi.mocked(fs.existsSync).mockReturnValue(false);
}

function createFakeGitProcess(exitCode = 0) {
  const proc = new EventEmitter() as EventEmitter & {
    stderr: PassThrough;
    stdout: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stderr = new PassThrough();
  proc.stdout = new PassThrough();
  proc.kill = vi.fn();
  // Emit close on the next tick
  setTimeout(() => proc.emit('close', exitCode), 0);
  return proc;
}

// ─── loadWorkspaceConfig — absent file ───────────────────────────────────────

describe('loadWorkspaceConfig — absent file', () => {
  beforeEach(() => mockWorkspaceAbsent());

  it('returns null when workspace.json does not exist', () => {
    const result = loadWorkspaceConfig('my-group');
    expect(result).toBeNull();
  });
});

// ─── loadWorkspaceConfig — monorepo mode ─────────────────────────────────────

describe('loadWorkspaceConfig — monorepo mode', () => {
  it('parses mode: "monorepo"', () => {
    mockWorkspaceFile(JSON.stringify({ mode: 'monorepo' }));
    const result = loadWorkspaceConfig('my-group');
    expect(result).toEqual({ mode: 'monorepo' });
  });

  it('isExclusive returns false for monorepo config', () => {
    mockWorkspaceFile(JSON.stringify({ mode: 'monorepo' }));
    const result = loadWorkspaceConfig('my-group');
    expect(isExclusive(result)).toBe(false);
  });

  it('isExclusive returns false for null', () => {
    expect(isExclusive(null)).toBe(false);
  });
});

// ─── loadWorkspaceConfig — exclusive mode ────────────────────────────────────

describe('loadWorkspaceConfig — exclusive mode', () => {
  const validConfig = {
    mode: 'exclusive',
    repo: 'chmod735-dor/mythos',
    branch: 'main',
    tokenEnvVar: 'GH_PAT_TOKEN_MYTHOS',
  };

  it('parses a valid exclusive config', () => {
    mockWorkspaceFile(JSON.stringify(validConfig));
    const result = loadWorkspaceConfig('my-group');
    expect(result).toEqual(validConfig);
  });

  it('isExclusive returns true for exclusive config', () => {
    mockWorkspaceFile(JSON.stringify(validConfig));
    const result = loadWorkspaceConfig('my-group');
    expect(isExclusive(result)).toBe(true);
  });

  it('accepts branch names with slashes and hyphens', () => {
    mockWorkspaceFile(
      JSON.stringify({ ...validConfig, branch: 'feat/some-feature' }),
    );
    const result = loadWorkspaceConfig('my-group');
    expect(result).not.toBeNull();
    if (result && 'branch' in result) {
      expect(result.branch).toBe('feat/some-feature');
    }
  });

  it('accepts repo names with dots and underscores', () => {
    mockWorkspaceFile(
      JSON.stringify({ ...validConfig, repo: 'org.name/repo_name.ext' }),
    );
    const result = loadWorkspaceConfig('my-group');
    expect(result).not.toBeNull();
  });
});

// ─── loadWorkspaceConfig — error cases ───────────────────────────────────────

describe('loadWorkspaceConfig — error cases', () => {
  it('throws on invalid JSON', () => {
    mockWorkspaceFile('{not valid json}');
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/not valid JSON/);
  });

  it('throws when root value is an array', () => {
    mockWorkspaceFile('[]');
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/JSON object/);
  });

  it('throws when mode is missing', () => {
    mockWorkspaceFile(JSON.stringify({ repo: 'a/b' }));
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/mode/);
  });

  it('throws on unknown mode value', () => {
    mockWorkspaceFile(JSON.stringify({ mode: 'hybrid' }));
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/mode/);
  });

  it('throws on exclusive mode without repo', () => {
    mockWorkspaceFile(
      JSON.stringify({ mode: 'exclusive', branch: 'main', tokenEnvVar: 'TOKEN' }),
    );
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/repo/);
  });

  it('throws on exclusive mode with invalid repo format (no slash)', () => {
    mockWorkspaceFile(
      JSON.stringify({
        mode: 'exclusive',
        repo: 'notvalid',
        branch: 'main',
        tokenEnvVar: 'TOKEN',
      }),
    );
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/repo/);
  });

  it('throws on exclusive mode with path-traversal in repo', () => {
    mockWorkspaceFile(
      JSON.stringify({
        mode: 'exclusive',
        repo: '../../etc/passwd',
        branch: 'main',
        tokenEnvVar: 'TOKEN',
      }),
    );
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/repo/);
  });

  it('throws on exclusive mode without branch', () => {
    mockWorkspaceFile(
      JSON.stringify({
        mode: 'exclusive',
        repo: 'org/repo',
        tokenEnvVar: 'TOKEN',
      }),
    );
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/branch/);
  });

  it('throws on exclusive mode with empty branch', () => {
    mockWorkspaceFile(
      JSON.stringify({
        mode: 'exclusive',
        repo: 'org/repo',
        branch: '',
        tokenEnvVar: 'TOKEN',
      }),
    );
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/branch/);
  });

  it('throws on exclusive mode without tokenEnvVar', () => {
    mockWorkspaceFile(
      JSON.stringify({ mode: 'exclusive', repo: 'org/repo', branch: 'main' }),
    );
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/tokenEnvVar/);
  });

  it('throws on exclusive mode with tokenEnvVar containing shell injection chars', () => {
    mockWorkspaceFile(
      JSON.stringify({
        mode: 'exclusive',
        repo: 'org/repo',
        branch: 'main',
        tokenEnvVar: 'FOO$(rm -rf /)',
      }),
    );
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/tokenEnvVar/);
  });

  it('throws on exclusive mode with tokenEnvVar containing path separators', () => {
    mockWorkspaceFile(
      JSON.stringify({
        mode: 'exclusive',
        repo: 'org/repo',
        branch: 'main',
        tokenEnvVar: '../../../etc/TOKEN',
      }),
    );
    expect(() => loadWorkspaceConfig('my-group')).toThrow(/tokenEnvVar/);
  });
});

// ─── cloneExternalRepo — token redaction ─────────────────────────────────────

describe('cloneExternalRepo', () => {
  const mockSpawn = vi.mocked(spawn);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls git clone with the token embedded in the URL', async () => {
    const fakeProc = createFakeGitProcess(0);
    mockSpawn.mockReturnValue(fakeProc as unknown as ReturnType<typeof spawn>);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

    await cloneExternalRepo('org/repo', 'main', 'secret-token-abc', 'run-42');

    expect(mockSpawn).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining([
        expect.stringContaining('secret-token-abc'),
        '--depth',
        '1',
        '--branch',
        'main',
      ]),
      expect.anything(),
    );
  });

  it('redacts token from stderr before propagating error message', async () => {
    const fakeProc = createFakeGitProcess(128);
    mockSpawn.mockReturnValue(fakeProc as unknown as ReturnType<typeof spawn>);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

    // Start the clone — spawn() is called synchronously inside, attaching the
    // stderr data listener before any timer fires.
    const clonePromise = cloneExternalRepo(
      'org/repo',
      'main',
      'secret-token-abc',
      'run-43',
    );

    // Push token-containing stderr synchronously (same microtask batch,
    // before the setTimeout(close, 0) fires) so it is collected and redacted
    // before the error is built.
    fakeProc.stderr.push('fatal: secret-token-abc: bad credentials');

    let caughtErr: Error | undefined;
    try {
      await clonePromise;
    } catch (e) {
      caughtErr = e as Error;
    }
    expect(caughtErr?.message).toContain('***');
    expect(caughtErr?.message).not.toContain('secret-token-abc');
  });

  it('returns the clone directory path on success', async () => {
    const fakeProc = createFakeGitProcess(0);
    mockSpawn.mockReturnValue(fakeProc as unknown as ReturnType<typeof spawn>);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

    const result = await cloneExternalRepo(
      'chmod735-dor/mythos',
      'main',
      'my-token',
      'run-99',
    );

    expect(result).toContain('chmod735-dor-mythos-run-99');
    expect(result).toContain('/tmp/test-ext-repos/');
  });
});
