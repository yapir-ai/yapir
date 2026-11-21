import { skillRow } from "@test/kit/factories/skill";
import { userRow } from "@test/kit/factories/user";
import { expect, test } from "@test/kit/test";

test("saves the edited description of the skill", async ({
  page,
  db,
  insert,
}) => {
  const skill = await insert(skillRow, { authorId: userRow().id });
  const description = "Review a pull request and its tests.";

  await page.goto(`/skills/${skill.id}`);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Save skill" }).click();

  await expect
    .poll(
      async () =>
        await db.query.skillTable.findFirst({ where: { id: skill.id } })
    )
    .toEqual({ ...skill, description });
});

test("lets the author update the skill without being an Organization Admin", async ({
  outsider,
  db,
  insert,
}) => {
  const uma = await db.query.userTable.findFirst({
    where: { email: "uma@yapir.test" },
  });

  const skill = await insert(skillRow, { authorId: uma!.id });

  const response = await outsider.patch(`/api/skills/${skill.id}`, {
    data: { name: "pull-request-review" },
  });

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    ...skill,
    name: "pull-request-review",
  });
});

test("returns the skill unchanged for a request without field", async ({
  page,
  db,
  insert,
}) => {
  const skill = await insert(skillRow, { authorId: userRow().id });

  const response = await page.request.patch(`/api/skills/${skill.id}`, {
    data: {},
  });

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(skill);
  expect(await db.query.skillTable.findMany()).toEqual([skill]);
});

test.describe("refuses an update", () => {
  const cases = [
    {
      name: "of a skill that does not exist",
      skill: undefined,
      client: "page",
      body: { name: "other" },
      status: 404,
      title: "SKILL_NOT_FOUND",
    },
    {
      name: "of a skill that another user authored",
      skill: {},
      client: "outsider",
      body: { name: "other" },
      status: 403,
      title: "SKILL_AUTHOR_REQUIRED",
    },
    {
      name: "of a deleted skill",
      skill: { deletedAt: new Date("2026-09-03T09:00:00Z") },
      client: "page",
      body: { name: "other" },
      status: 409,
      title: "SKILL_DELETED",
    },
    {
      name: "with an uppercase name",
      skill: {},
      client: "page",
      body: { name: "Other" },
      status: 400,
      title: undefined,
    },
    {
      name: "with a blank description",
      skill: {},
      client: "page",
      body: { description: " " },
      status: 400,
      title: undefined,
    },
    {
      name: "with an unknown field",
      skill: {},
      client: "page",
      body: { authorId: "01960000-0000-7000-8000-000000000002" },
      status: 400,
      title: undefined,
    },
  ] as const;

  for (const { name, skill, client, body, status, title } of cases) {
    test(name, async ({ page, outsider, db, insert }) => {
      const row =
        skill && (await insert(skillRow, { authorId: userRow().id, ...skill }));

      const id = row?.id ?? "01960000-0000-7000-8000-000000000999";

      const response = await (
        client === "page" ? page.request : outsider
      ).patch(`/api/skills/${id}`, { data: body });

      expect(response.status()).toBe(status);

      if (title) {
        expect(await response.json()).toMatchObject({ title, status });
      }

      expect(await db.query.skillTable.findMany()).toEqual(row ? [row] : []);
    });
  }
});
