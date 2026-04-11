/**
 * Workspace configuration for NanoClaw container groups.
 *
 * Each group can optionally have a `workspace.json` file in its group folder
 * that declares which Git repository the Architect container should work
 * against. Two modes are supported:
 *
 *  - "monorepo" (default when file is absent): the existing behaviour —
 *    a git worktree of the limitless monorepo is mounted at
 *    /workspace/extra/monorepo inside the container.
 *
 *  - "exclusive": an external repository is cloned fresh for each container
 *    run and mounted at /workspace/extra/repo. The limitless monorepo is NOT
 *    mounted, enforcing IP isolation by construction.
 */
import { ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { EXT_REPOS_BASE } from './config.js';
import { resolveGroupFolderPath } from './group-folder.js';
import { logger } from './logger.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkspaceMode = 'monorepo' | 'exclusive';

export interface MonorepoWorkspaceConfig {
  mode: 'monorepo';
}

export interface ExclusiveWorkspaceConfig {
  mode: 'exclusive';
  /** GitHub "owner/repo" slug (e.g. "chmod735-dor/mythos"). */
  repo: string;
  /** Branch to check out (e.g. "main"). */
  branch: string;
  /**
   * Name of a host-side environment variable whose value is used as
   * GH_TOKEN inside the container. Never hardcoded; must not be logged.
   */
  tokenEnvVar: string;
}

export type WorkspaceConfig = MonorepoWorkspaceConfig | ExclusiveWorkspaceConfig;

export function isExclusive(
  config: WorkspaceConfig | null,
): config is ExclusiveWorkspaceConfig {
  return config?.mode === 'exclusive';
}

// ─── Validation patterns ─────────────────────────────────────────────────────

// owner/repo: each component alphanumeric + hyphens/dots/underscores, no leading dot/hyphen
const REPO_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;

// Standard env var name: letters/underscore, then letters/digits/underscore
const ENV_VAR_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Branch names: alphanumeric, hyphens, dots, forward-slashes, underscores
const BRANCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/\-]*$/;

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Load and validate `workspace.json` from the group's folder.
 *
 * Returns `null` when the file is absent (equivalent to `mode: "monorepo"`).
 * Throws a descriptive Error on invalid content — the caller should surface
 * this to the operator rather than silently falling back to monorepo mode.
 */
export function loadWorkspaceConfig(groupFolder: string): WorkspaceConfig | null {
  const groupDir = resolveGroupFolderPath(groupFolder);
  const configPath = path.join(groupDir, 'workspace.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(
      `workspace.json for group "${groupFolder}" is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(
      `workspace.json for group "${groupFolder}" must be a JSON object`,
    );
  }

  const obj = raw as Record<string, unknown>;
  const { mode } = obj;

  if (mode !== 'monorepo' && mode !== 'exclusive') {
    throw new Error(
      `workspace.json "mode" must be "monorepo" or "exclusive", got: ${JSON.stringify(mode)}`,
    );
  }

  if (mode === 'monorepo') {
    return { mode: 'monorepo' };
  }

  // exclusive — validate all required fields
  const { repo, branch, tokenEnvVar } = obj;

  if (typeof repo !== 'string' || !REPO_PATTERN.test(repo)) {
    throw new Error(
      `workspace.json "repo" must be "owner/repo" format, got: ${JSON.stringify(repo)}`,
    );
  }

  if (
    typeof branch !== 'string' ||
    branch.length === 0 ||
    !BRANCH_PATTERN.test(branch)
  ) {
    throw new Error(
      `workspace.json "branch" must be a non-empty string with safe characters (alphanumeric, hyphens, dots, slashes, underscores), got: ${JSON.stringify(branch)}`,
    );
  }

  if (typeof tokenEnvVar !== 'string' || !ENV_VAR_PATTERN.test(tokenEnvVar)) {
    throw new Error(
      `workspace.json "tokenEnvVar" must be a valid environment variable name, got: ${JSON.stringify(tokenEnvVar)}`,
    );
  }

  return { mode: 'exclusive', repo, branch, tokenEnvVar };
}

// ─── Repo cloning ─────────────────────────────────────────────────────────────

const CLONE_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Clone an external GitHub repository to a temporary directory.
 *
 * Authentication: HTTPS with token embedded in the URL (token is sanitised
 * from all log output and error messages before they leave this function).
 *
 * The caller is responsible for deleting the returned directory when the
 * container run finishes.
 */
export async function cloneExternalRepo(
  repo: string,
  branch: string,
  token: string,
  runId: string,
): Promise<string> {
  const safeSlug = repo.replace(/[^A-Za-z0-9-]/g, '-');
  const cloneDir = path.join(EXT_REPOS_BASE, `${safeSlug}-${runId}`);

  fs.mkdirSync(cloneDir, { recursive: true });

  // NEVER log cloneUrl — it contains the token.
  const cloneUrl = `https://x-access-token:${token}@github.com/${repo}.git`;

  logger.info({ repo, branch, cloneDir }, 'Cloning external repo');

  await new Promise<void>((resolve, reject) => {
    const gitProc: ChildProcess = spawn(
      'git',
      [
        'clone',
        '--depth',
        '1',
        '--branch',
        branch,
        '--single-branch',
        cloneUrl,
        cloneDir,
      ],
      {
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stderr = '';

    (gitProc.stderr as NodeJS.ReadableStream | null)?.on(
      'data',
      (d: Buffer) => {
        // Redact the token before accumulating stderr
        stderr += d.toString().replace(
          new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          '***',
        );
      },
    );

    const cloneTimeout = setTimeout(() => {
      try {
        gitProc.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new Error(`git clone timed out after ${CLONE_TIMEOUT_MS}ms`));
    }, CLONE_TIMEOUT_MS);

    gitProc.on('close', (code: number | null) => {
      clearTimeout(cloneTimeout);
      if (code === 0) {
        logger.info({ repo, branch, cloneDir }, 'External repo cloned successfully');
        resolve();
      } else {
        reject(
          new Error(
            `git clone failed (exit code ${code ?? 'null'}): ${stderr.slice(-500)}`,
          ),
        );
      }
    });

    gitProc.on('error', (err: Error) => {
      clearTimeout(cloneTimeout);
      reject(new Error(`git clone spawn error: ${err.message}`));
    });
  });

  return cloneDir;
}
