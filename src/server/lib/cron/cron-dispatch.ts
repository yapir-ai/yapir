import type { ConversationPurgeOperation } from "@server/lib/conversations/conversation-purge.operation";
import type { Db } from "@server/lib/db";
import { cronTickTable } from "@server/lib/db/schema";
import type { EventProcessOperation } from "@server/lib/events/event-process.operation";
import type { GitlabWebhookSync } from "@server/lib/gitlab/gitlab-webhook-sync";
import type { McpServerRefreshOperation } from "@server/lib/mcp-servers/mcp-server-refresh.operation";
import { scheduleEventType } from "@server/lib/schedules/schedule.trigger";
import type { TaskPurgeOperation } from "@server/lib/tasks/task-purge.operation";
import { purgeInterval, retention } from "@server/lib/tasks/task-retention";
import type { TaskMachine } from "@server/lib/tasks/task.machine";
import { lt } from "drizzle-orm";

// The MCP servers' tool snapshots and the GitLab webhooks are refreshed at 0, 6, 12 and 18 UTC.
const refreshInterval = 6 * 60 * 60_000;

export function cronDispatch({
  db,
  eventProcessOperation,
  taskMachine,
  mcpServerRefreshOperation,
  gitlabWebhookSync,
  taskPurgeOperation,
  conversationPurgeOperation,
  executionContext,
}: {
  db: Db;
  eventProcessOperation: EventProcessOperation;
  taskMachine: TaskMachine;
  mcpServerRefreshOperation: McpServerRefreshOperation;
  gitlabWebhookSync: Promise<GitlabWebhookSync | undefined>;
  taskPurgeOperation: TaskPurgeOperation;
  conversationPurgeOperation: ConversationPurgeOperation;
  executionContext: Pick<ExecutionContext, "waitUntil">;
}) {
  // False when another instance already ran this minute.
  async function claim(scheduledAt: Date) {
    const claimed = await db
      .insert(cronTickTable)
      .values({ scheduledAt })
      .onConflictDoUpdate({
        target: cronTickTable.id,
        set: { scheduledAt },
        setWhere: lt(cronTickTable.scheduledAt, scheduledAt),
      })
      .returning({ id: cronTickTable.id });

    return claimed.length > 0;
  }

  async function syncGitlabWebhooks() {
    await (await gitlabWebhookSync)?.execute();
  }

  async function execute(time: number) {
    // One occurrence per UTC minute: ticks are not aligned on second 0.
    const scheduledTime = time - (time % 60_000);

    if (!(await claim(new Date(scheduledTime)))) {
      return;
    }

    const work = [
      eventProcessOperation.execute({
        id: String(scheduledTime),
        type: scheduleEventType,
        payload: { scheduledTime },
      }),
      taskMachine.expire(),
    ];

    if (scheduledTime % refreshInterval === 0) {
      work.push(mcpServerRefreshOperation.execute());
      executionContext.waitUntil(syncGitlabWebhooks());
    }

    if (scheduledTime % purgeInterval === 0) {
      const cutoff = new Date(scheduledTime - retention);
      work.push(
        taskPurgeOperation.execute(cutoff),
        conversationPurgeOperation.execute(cutoff)
      );
    }

    await Promise.all(work);
  }

  return { execute };
}
