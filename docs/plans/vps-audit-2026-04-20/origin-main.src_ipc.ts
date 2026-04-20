import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { CronExpressionParser } from 'cron-parser';

import { DATA_DIR, IPC_POLL_INTERVAL, MONOREPO_PATH, NOTIFICATION_CHANNELS, TIMEZONE, WORKTREE_BASE } from './config.js';
import { AvailableGroup } from './container-runner.js';
import { createTask, deleteTask, deleteRegisteredGroup, getTaskById, updateTask } from './db.js';
import { isValidGroupFolder } from './group-folder.js';
import { logger } from './logger.js';
import { RegisteredGroup } from './types.js';

export interface IpcDeps {
  sendMessage: (jid: string, text: string) => Promise<void>;
  registeredGroups: () => Record<string, RegisteredGroup>;
  registerGroup: (jid: string, group: RegisteredGroup) => void;
  syncGroups: (force: boolean) => Promise<void>;
  getAvailableGroups: () => AvailableGroup[];
  writeGroupsSnapshot: (
    groupFolder: string,
    isMain: boolean,
    availableGroups: AvailableGroup[],
    registeredJids: Set<string>,
  ) => void;
  onTasksChanged: () => void;
}

let ipcWatcherRunning = false;

export function startIpcWatcher(deps: IpcDeps): void {
  if (ipcWatcherRunning) {
    logger.debug('IPC watcher already running, skipping duplicate start');
    return;
  }
  ipcWatcherRunning = true;

  const ipcBaseDir = path.join(DATA_DIR, 'ipc');
  fs.mkdirSync(ipcBaseDir, { recursive: true });

  const processIpcFiles = async () => {
    // Scan all group IPC directories (identity determined by directory)
    let groupFolders: string[];
    try {
      groupFolders = fs.readdirSync(ipcBaseDir).filter((f) => {
        const stat = fs.statSync(path.join(ipcBaseDir, f));
        return stat.isDirectory() && f !== 'errors';
      });
    } catch (err) {
      logger.error({ err }, 'Error reading IPC base directory');
      setTimeout(processIpcFiles, IPC_POLL_INTERVAL);
      return;
    }

    const registeredGroups = deps.registeredGroups();

    // Build folder→isMain lookup from registered groups
    const folderIsMain = new Map<string, boolean>();
    for (const group of Object.values(registeredGroups)) {
      if (group.isMain) folderIsMain.set(group.folder, true);
    }

    for (const sourceGroup of groupFolders) {
      const isMain = folderIsMain.get(sourceGroup) === true;
      const messagesDir = path.join(ipcBaseDir, sourceGroup, 'messages');
      const tasksDir = path.join(ipcBaseDir, sourceGroup, 'tasks');

      // Process messages from this group's IPC directory
      try {
        if (fs.existsSync(messagesDir)) {
          const messageFiles = fs
            .readdirSync(messagesDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of messageFiles) {
            const filePath = path.join(messagesDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              if (data.type === 'message' && data.chatJid && data.text) {
                // Authorization: verify this group can send to this chatJid
                const targetGroup = registeredGroups[data.chatJid];
                if (
                  isMain ||
                  (targetGroup && targetGroup.folder === sourceGroup)
                ) {
                  await deps.sendMessage(data.chatJid, data.text);
                  logger.info(
                    { chatJid: data.chatJid, sourceGroup },
                    'IPC message sent',
                  );
                } else {
                  logger.warn(
                    { chatJid: data.chatJid, sourceGroup },
                    'Unauthorized IPC message attempt blocked',
                  );
                }
              } else if (data.type === 'notification' && data.channel && data.text) {
                // Notifications bypass normal message authorization.
                // Any group can post notifications to predefined channels.
                const channelJid = NOTIFICATION_CHANNELS[data.channel];
                if (channelJid) {
                  const prefix = data.priority === 'urgent' ? '\u{1f6a8} ' : '';
                  await deps.sendMessage(channelJid, `${prefix}${data.text}`);
                  logger.info(
                    { channel: data.channel, sourceGroup, priority: data.priority },
                    'IPC notification sent',
                  );
                } else {
                  logger.warn(
                    { channel: data.channel, sourceGroup },
                    'Unknown notification channel',
                  );
                }
              }
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC message',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error(
          { err, sourceGroup },
          'Error reading IPC messages directory',
        );
      }

      // Process tasks from this group's IPC directory
      try {
        if (fs.existsSync(tasksDir)) {
          const taskFiles = fs
            .readdirSync(tasksDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of taskFiles) {
            const filePath = path.join(tasksDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              // Pass source group identity to processTaskIpc for authorization
              await processTaskIpc(data, sourceGroup, isMain, deps);
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC task',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err, sourceGroup }, 'Error reading IPC tasks directory');
      }
      // Process status from this group's IPC directory (heartbeat, completion, failure)
      const statusDir = path.join(ipcBaseDir, sourceGroup, 'status');
      try {
        if (fs.existsSync(statusDir)) {
          const statusFiles = fs
            .readdirSync(statusDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of statusFiles) {
            const filePath = path.join(statusDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              // Relay status to main group's worker-status directory
              const mainFolder = [...folderIsMain.entries()].find(([, v]) => v)?.[0];
              if (mainFolder) {
                const workerStatusDir = path.join(ipcBaseDir, mainFolder, 'worker-status');
                fs.mkdirSync(workerStatusDir, { recursive: true });
                fs.writeFileSync(
                  path.join(workerStatusDir, `${sourceGroup}.json`),
                  JSON.stringify(
                    { ...data, workerGroup: sourceGroup, relayedAt: new Date().toISOString() },
                    null,
                    2,
                  ),
                );
                logger.debug(
                  { sourceGroup, type: data.type },
                  'Worker status relayed to main group',
                );
              }
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC status',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-status-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err, sourceGroup }, 'Error reading IPC status directory');
      }
    }

    // Stale heartbeat detection: check all relayed worker statuses
    const mainFolderForStale = [...folderIsMain.entries()].find(([, v]) => v)?.[0];
    if (mainFolderForStale) {
      const workerStatusDir = path.join(ipcBaseDir, mainFolderForStale, 'worker-status');
      if (fs.existsSync(workerStatusDir)) {
        for (const entry of fs.readdirSync(workerStatusDir).filter((f) => f.endsWith('.json'))) {
          try {
            const statusPath = path.join(workerStatusDir, entry);
            const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
            if (statusData.type === 'heartbeat' && statusData.timestamp && !statusData.stale) {
              const ageMs = Date.now() - new Date(statusData.timestamp).getTime();
              if (ageMs > 10 * 60 * 1000) {
                statusData.stale = true;
                statusData.staleDetectedAt = new Date().toISOString();
                fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
                logger.warn(
                  { workerGroup: statusData.workerGroup, ageMinutes: Math.round(ageMs / 60000) },
                  'Stale worker heartbeat detected',
                );
              }
            }
          } catch { /* skip malformed entries */ }
        }
      }
    }

    setTimeout(processIpcFiles, IPC_POLL_INTERVAL);
  };

  processIpcFiles();
  logger.info('IPC watcher started (per-group namespaces)');
}

export async function processTaskIpc(
  data: {
    type: string;
    taskId?: string;
    prompt?: string;
    schedule_type?: string;
    schedule_value?: string;
    context_mode?: string;
    script?: string;
    groupFolder?: string;
    chatJid?: string;
    targetJid?: string;
    // For register_group
    jid?: string;
    name?: string;
    folder?: string;
    trigger?: string;
    requiresTrigger?: boolean;
    containerConfig?: RegisteredGroup['containerConfig'];
  },
  sourceGroup: string, // Verified identity from IPC directory
  isMain: boolean, // Verified from directory path
  deps: IpcDeps,
): Promise<void> {
  const registeredGroups = deps.registeredGroups();

  switch (data.type) {
    case 'schedule_task':
      if (
        data.prompt &&
        data.schedule_type &&
        data.schedule_value &&
        data.targetJid
      ) {
        // Resolve the target group from JID
        const targetJid = data.targetJid as string;
        const targetGroupEntry = registeredGroups[targetJid];

        if (!targetGroupEntry) {
          logger.warn(
            { targetJid },
            'Cannot schedule task: target group not registered',
          );
          break;
        }

        const targetFolder = targetGroupEntry.folder;

        // Authorization: non-main groups can only schedule for themselves
        if (!isMain && targetFolder !== sourceGroup) {
          logger.warn(
            { sourceGroup, targetFolder },
            'Unauthorized schedule_task attempt blocked',
          );
          break;
        }

        const scheduleType = data.schedule_type as 'cron' | 'interval' | 'once';

        let nextRun: string | null = null;
        if (scheduleType === 'cron') {
          try {
            const interval = CronExpressionParser.parse(data.schedule_value, {
              tz: TIMEZONE,
            });
            nextRun = interval.next().toISOString();
          } catch {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid cron expression',
            );
            break;
          }
        } else if (scheduleType === 'interval') {
          const ms = parseInt(data.schedule_value, 10);
          if (isNaN(ms) || ms <= 0) {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid interval',
            );
            break;
          }
          nextRun = new Date(Date.now() + ms).toISOString();
        } else if (scheduleType === 'once') {
          const date = new Date(data.schedule_value);
          if (isNaN(date.getTime())) {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid timestamp',
            );
            break;
          }
          nextRun = date.toISOString();
        }

        const taskId =
          data.taskId ||
          `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const contextMode =
          data.context_mode === 'group' || data.context_mode === 'isolated'
            ? data.context_mode
            : 'isolated';
        createTask({
          id: taskId,
          group_folder: targetFolder,
          chat_jid: targetJid,
          prompt: data.prompt,
          script: data.script || null,
          schedule_type: scheduleType,
          schedule_value: data.schedule_value,
          context_mode: contextMode,
          next_run: nextRun,
          status: 'active',
          created_at: new Date().toISOString(),
        });
        logger.info(
          { taskId, sourceGroup, targetFolder, contextMode },
          'Task created via IPC',
        );
        deps.onTasksChanged();
      }
      break;

    case 'pause_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          updateTask(data.taskId, { status: 'paused' });
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task paused via IPC',
          );
          deps.onTasksChanged();
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task pause attempt',
          );
        }
      }
      break;

    case 'resume_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          updateTask(data.taskId, { status: 'active' });
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task resumed via IPC',
          );
          deps.onTasksChanged();
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task resume attempt',
          );
        }
      }
      break;

    case 'cancel_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          deleteTask(data.taskId);
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task cancelled via IPC',
          );
          deps.onTasksChanged();
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task cancel attempt',
          );
        }
      }
      break;

    case 'update_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (!task) {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Task not found for update',
          );
          break;
        }
        if (!isMain && task.group_folder !== sourceGroup) {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task update attempt',
          );
          break;
        }

        const updates: Parameters<typeof updateTask>[1] = {};
        if (data.prompt !== undefined) updates.prompt = data.prompt;
        if (data.script !== undefined) updates.script = data.script || null;
        if (data.schedule_type !== undefined)
          updates.schedule_type = data.schedule_type as
            | 'cron'
            | 'interval'
            | 'once';
        if (data.schedule_value !== undefined)
          updates.schedule_value = data.schedule_value;

        // Recompute next_run if schedule changed
        if (data.schedule_type || data.schedule_value) {
          const updatedTask = {
            ...task,
            ...updates,
          };
          if (updatedTask.schedule_type === 'cron') {
            try {
              const interval = CronExpressionParser.parse(
                updatedTask.schedule_value,
                { tz: TIMEZONE },
              );
              updates.next_run = interval.next().toISOString();
            } catch {
              logger.warn(
                { taskId: data.taskId, value: updatedTask.schedule_value },
                'Invalid cron in task update',
              );
              break;
            }
          } else if (updatedTask.schedule_type === 'interval') {
            const ms = parseInt(updatedTask.schedule_value, 10);
            if (!isNaN(ms) && ms > 0) {
              updates.next_run = new Date(Date.now() + ms).toISOString();
            }
          }
        }

        updateTask(data.taskId, updates);
        logger.info(
          { taskId: data.taskId, sourceGroup, updates },
          'Task updated via IPC',
        );
        deps.onTasksChanged();
      }
      break;

    case 'refresh_groups':
      // Only main group can request a refresh
      if (isMain) {
        logger.info(
          { sourceGroup },
          'Group metadata refresh requested via IPC',
        );
        await deps.syncGroups(true);
        // Write updated snapshot immediately
        const availableGroups = deps.getAvailableGroups();
        deps.writeGroupsSnapshot(
          sourceGroup,
          true,
          availableGroups,
          new Set(Object.keys(registeredGroups)),
        );
      } else {
        logger.warn(
          { sourceGroup },
          'Unauthorized refresh_groups attempt blocked',
        );
      }
      break;

    case 'register_group':
      // Only main group can register new groups
      if (!isMain) {
        logger.warn(
          { sourceGroup },
          'Unauthorized register_group attempt blocked',
        );
        break;
      }
      if (data.jid && data.name && data.folder && data.trigger) {
        if (!isValidGroupFolder(data.folder)) {
          logger.warn(
            { sourceGroup, folder: data.folder },
            'Invalid register_group request - unsafe folder name',
          );
          break;
        }
        // Defense in depth: agent cannot set isMain via IPC.
        // Preserve isMain from the existing registration so IPC config
        // updates (e.g. adding additionalMounts) don't strip the flag.
        const existingGroup = registeredGroups[data.jid];
        deps.registerGroup(data.jid, {
          name: data.name,
          folder: data.folder,
          trigger: data.trigger,
          added_at: new Date().toISOString(),
          containerConfig: data.containerConfig,
          requiresTrigger: data.requiresTrigger,
          isMain: existingGroup?.isMain,
        });

        // Create git worktree for worker groups that have AGENT_SCOPE
        const envVars = data.containerConfig?.envVars;
        if (MONOREPO_PATH && envVars?.AGENT_SCOPE) {
          try {
            const worktreeDir = path.join(WORKTREE_BASE, data.folder);
            const branchName = `work/${(envVars.AGENT_ROLE || 'worker')}-${data.folder}-${Date.now()}`;
            fs.mkdirSync(WORKTREE_BASE, { recursive: true });
            execSync(
              `git worktree add "${worktreeDir}" -b "${branchName}"`,
              { cwd: MONOREPO_PATH, stdio: 'pipe' },
            );
            logger.info(
              { folder: data.folder, worktreeDir, branchName },
              'Git worktree created for worker group',
            );
          } catch (err) {
            logger.error(
              { folder: data.folder, err },
              'Failed to create git worktree for worker (non-fatal)',
            );
          }
        }
      } else {
        logger.warn(
          { data },
          'Invalid register_group request - missing required fields',
        );
      }
      break;


    case 'deregister_group':
      // Only main group can deregister groups
      if (!isMain) {
        logger.warn(
          { sourceGroup },
          'Unauthorized deregister_group attempt blocked',
        );
        break;
      }
      if (data.jid) {
        const targetGroup = registeredGroups[data.jid];
        if (!targetGroup) {
          logger.warn(
            { jid: data.jid },
            'Cannot deregister: group not found',
          );
          break;
        }
        // Safety: never allow deregistering the main group
        if (targetGroup.isMain) {
          logger.warn(
            { jid: data.jid },
            'Cannot deregister main group',
          );
          break;
        }
        const deleted = deleteRegisteredGroup(data.jid);
        if (deleted) {
          // Clean up group folder (IPC dir, session data)
          const groupDir = path.join(DATA_DIR, 'groups', targetGroup.folder);
          const ipcDir = path.join(DATA_DIR, 'ipc', targetGroup.folder);
          try {
            if (fs.existsSync(ipcDir)) fs.rmSync(ipcDir, { recursive: true });
            // Keep group folder for session history (logs, CLAUDE.md)
            // but remove IPC dir to prevent stale message processing
          } catch (err) {
            logger.error({ err, folder: targetGroup.folder }, 'Error cleaning up deregistered group');
          }
          // Clean up git worktree if one was created
          if (MONOREPO_PATH) {
            const worktreeDir = path.join(WORKTREE_BASE, targetGroup.folder);
            try {
              if (fs.existsSync(worktreeDir)) {
                execSync(
                  `git worktree remove "${worktreeDir}" --force`,
                  { cwd: MONOREPO_PATH, stdio: 'pipe' },
                );
                logger.info(
                  { folder: targetGroup.folder, worktreeDir },
                  'Git worktree removed for deregistered group',
                );
              }
            } catch (err) {
              logger.error(
                { folder: targetGroup.folder, err },
                'Failed to remove git worktree (non-fatal)',
              );
            }
          }
          // Refresh in-memory groups
          await deps.syncGroups(true);
          logger.info(
            { jid: data.jid, folder: targetGroup.folder, sourceGroup },
            'Group deregistered via IPC',
          );
        }
      } else {
        logger.warn({ data }, 'Invalid deregister_group request - missing jid');
      }
      break;
    default:
      logger.warn({ type: data.type }, 'Unknown IPC task type');
  }
}
