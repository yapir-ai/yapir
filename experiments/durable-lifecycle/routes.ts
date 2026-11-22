import type { TaskEvent, Usage } from "./domain";
import { engine } from "./engine";
import { Execution } from "./execution";
import { dispatchOperation, releaseOperation } from "./operations";
import { Task } from "./task";

const turnAnswer = (reply: ReturnType<Execution["pull"]>) =>
  reply.end
    ? { attempt: reply.end.outcome }
    : { attempt: "running" as const, events: reply.events };

export function registerActivities(env: Record<string, string>) {
  engine.register(dispatchOperation, dispatchOperation({ env }));
  engine.register(releaseOperation, releaseOperation({ env }));
}

export async function receiveEvent(taskId: string, event: TaskEvent) {
  await engine.start(Task, taskId).receive(event);
}

export async function stopTask(taskId: string, userId: string) {
  await engine.get(Task, taskId).stop(userId);
}

export async function claimExecution(executionId: string) {
  return { claimed: await engine.get(Execution, executionId).claim() };
}

export async function pullExecution(executionId: string, usage?: Usage) {
  return turnAnswer(await engine.get(Execution, executionId).pull(usage));
}

export async function endExecutionTurn(executionId: string, usage?: Usage) {
  return turnAnswer(await engine.get(Execution, executionId).endTurn(usage));
}

export async function failExecution(executionId: string, error: string) {
  const { end } = await engine.get(Execution, executionId).fail(error);

  return { attempt: end.outcome };
}
