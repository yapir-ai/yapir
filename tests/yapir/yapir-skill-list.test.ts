import { skillRow } from "@test/kit/factories/skill";
import { userRow } from "@test/kit/factories/user";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

const author = userRow();

const releaseNotes = skillRow({ authorId: author.id });

const triage = skillRow({
  id: "01960000-0000-7000-8000-000000000902",
  name: "triage",
  description: "Label an issue.",
  instructions: "Read the issue, then label it.",
  authorId: author.id,
});

const listed = {
  [releaseNotes.id]: {
    id: releaseNotes.id,
    deletedAt: null,
    name: "release-notes",
    description: "Write the release notes of a change.",
    instructions: "List the changes that a user sees.",
    authorId: author.id,
  },
  [triage.id]: {
    id: triage.id,
    deletedAt: null,
    name: "triage",
    description: "Label an issue.",
    instructions: "Read the issue, then label it.",
    authorId: author.id,
  },
};

for (const { title, unscoped, skillIds, expected } of [
  {
    title: "a scoped grant reads the skills of its agent",
    unscoped: false,
    skillIds: [releaseNotes.id],
    expected: [releaseNotes.id],
  },
  {
    title: "a scoped grant of an agent without skills reads no skill",
    unscoped: false,
    skillIds: [],
    expected: [],
  },
  {
    title: "an unscoped grant reads the skills of the organization",
    unscoped: true,
    skillIds: [releaseNotes.id],
    expected: [triage.id, releaseNotes.id],
  },
]) {
  test(title, async ({ insert, mcp }) => {
    await insert(userRow, author);
    await insert(skillRow, [releaseNotes, triage]);
    await insertRunningExecution(insert, {
      capabilities: [{ name: "yapir.configuration.read", unscoped }],
      agent: { skillIds },
    });

    expect(await mcp.call(executionToken, "yapir_skill_list")).toEqual({
      items: expected.map((id) => listed[id]),
    });
  });
}
