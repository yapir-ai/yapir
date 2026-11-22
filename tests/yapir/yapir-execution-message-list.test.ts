import { executionMessageRow } from "@test/kit/factories/execution-message";
import type { inserter } from "@test/kit/insert";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

const reasoning = "The review asks for a check. ".repeat(10);

const fileContent = "export const answer = 42;\n".repeat(20);

async function insertTranscript(insert: ReturnType<typeof inserter>) {
  const { execution } = await insertRunningExecution(insert, {
    capabilities: [{ name: "yapir.tasks.read", unscoped: false }],
  });

  const message = await insert(executionMessageRow, {
    executionId: execution.id,
    message: {
      id: "01960000-0000-7000-8000-000000001001",
      role: "assistant",
      parts: [
        { type: "reasoning", text: reasoning },
        {
          type: "dynamic-tool",
          toolName: "Read",
          toolCallId: "call-1",
          state: "output-available",
          input: { path: "src/answer.ts" },
          output: fileContent,
        },
        { type: "text", text: "Done." },
      ],
    },
  });

  return { execution, message };
}

test("a transcript read gives excerpts without the tool outputs", async ({
  insert,
  mcp,
}) => {
  const { execution, message } = await insertTranscript(insert);

  expect(
    await mcp.call(executionToken, "yapir_execution_message_list", {
      maxPartLength: 40,
    })
  ).toEqual({
    items: [
      {
        id: message.id,
        executionId: execution.id,
        createdAt: message.createdAt.toISOString(),
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: reasoning.slice(0, 40),
            omitted: reasoning.length - 40,
          },
          {
            type: "tool",
            toolName: "Read",
            state: "output-available",
            input: { text: '{"path":"src/answer.ts"}', omitted: 0 },
          },
          { type: "text", text: "Done.", omitted: 0 },
        ],
      },
    ],
  });
});

test("a transcript read with tool outputs gives their excerpts", async ({
  insert,
  mcp,
}) => {
  const { execution, message } = await insertTranscript(insert);

  expect(
    await mcp.call(executionToken, "yapir_execution_message_list", {
      id: [message.id],
      maxPartLength: 40,
      toolOutputs: true,
    })
  ).toEqual({
    items: [
      {
        id: message.id,
        executionId: execution.id,
        createdAt: message.createdAt.toISOString(),
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: reasoning.slice(0, 40),
            omitted: reasoning.length - 40,
          },
          {
            type: "tool",
            toolName: "Read",
            state: "output-available",
            input: { text: '{"path":"src/answer.ts"}', omitted: 0 },
            output: {
              text: JSON.stringify(fileContent).slice(0, 40),
              omitted: JSON.stringify(fileContent).length - 40,
            },
          },
          { type: "text", text: "Done.", omitted: 0 },
        ],
      },
    ],
  });
});
