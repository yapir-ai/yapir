import { skillRow } from "@test/kit/factories/skill";
import { userRow } from "@test/kit/factories/user";
import { expect, test } from "@test/kit/test";

test("deletes the skill and goes back to the list", async ({
  page,
  db,
  insert,
  clock,
}) => {
  const skill = await insert(skillRow, { authorId: userRow().id });

  await page.goto(`/skills/${skill.id}`);
  await page.getByRole("button", { name: "Delete skill" }).click();
  await page.getByRole("button", { name: "Confirm deletion?" }).click();
  await expect(page).toHaveURL(/\/skills$/u);

  await expect
    .poll(
      async () =>
        await db.query.skillTable.findFirst({ where: { id: skill.id } })
    )
    .toEqual({ ...skill, deletedAt: clock.now });
});

test("answers 204 for a skill that does not exist, and keeps the first deletion date of a deleted skill", async ({
  page,
  db,
  insert,
  clock,
}) => {
  const deletedAt = new Date("2026-08-31T09:00:00Z");

  const skill = await insert(skillRow, {
    authorId: userRow().id,
    deletedAt,
  });

  expect(clock.now).not.toEqual(deletedAt);

  const absent = await page.request.delete(
    "/api/skills/01960000-0000-7000-8000-000000000999"
  );

  const deleted = await page.request.delete(`/api/skills/${skill.id}`);

  expect([absent.status(), deleted.status()]).toEqual([204, 204]);
  expect(await db.query.skillTable.findMany()).toEqual([skill]);
});

test.describe("refuses a deletion", () => {
  const cases = [
    {
      name: "of a skill that another user authored",
      id: "01960000-0000-7000-8000-000000000601",
      status: 403,
      title: "SKILL_AUTHOR_REQUIRED",
    },
    {
      name: "with an ID that is not a UUID",
      id: "skill",
      status: 400,
      title: undefined,
    },
  ] as const;

  for (const { name, id, status, title } of cases) {
    test(name, async ({ outsider, db, insert }) => {
      const admin = await insert(userRow);
      const skill = await insert(skillRow, { authorId: admin.id });

      const response = await outsider.delete(`/api/skills/${id}`);

      expect(response.status()).toBe(status);

      if (title) {
        expect(await response.json()).toMatchObject({ title, status });
      }

      expect(await db.query.skillTable.findMany()).toEqual([skill]);
    });
  }
});
