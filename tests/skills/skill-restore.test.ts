import { skillRow } from "@test/kit/factories/skill";
import { userRow } from "@test/kit/factories/user";
import { expect, test } from "@test/kit/test";

test("restores the deleted skill", async ({ page, db, insert }) => {
  const skill = await insert(skillRow, {
    authorId: userRow().id,
    deletedAt: new Date("2026-09-03T09:00:00Z"),
  });

  await page.goto(`/skills/${skill.id}`);
  await page.getByRole("button", { name: "Restore skill" }).click();

  await expect
    .poll(
      async () =>
        await db.query.skillTable.findFirst({ where: { id: skill.id } })
    )
    .toEqual({ ...skill, deletedAt: null });
});

test.describe("refuses a restoration", () => {
  const cases = [
    {
      name: "of a skill that does not exist",
      id: "01960000-0000-7000-8000-000000000999",
      client: "page",
      status: 404,
      title: "SKILL_NOT_FOUND",
    },
    {
      name: "of a skill that another user authored",
      id: "01960000-0000-7000-8000-000000000601",
      client: "outsider",
      status: 403,
      title: "SKILL_AUTHOR_REQUIRED",
    },
    {
      name: "with an ID that is not a UUID",
      id: "skill",
      client: "page",
      status: 400,
      title: undefined,
    },
  ] as const;

  for (const { name, id, client, status, title } of cases) {
    test(name, async ({ page, outsider, db, insert }) => {
      const skill = await insert(skillRow, {
        authorId: userRow().id,
        deletedAt: new Date("2026-09-03T09:00:00Z"),
      });

      const response = await (client === "page" ? page.request : outsider).post(
        `/api/skills/${id}/restore`
      );

      expect(response.status()).toBe(status);

      if (title) {
        expect(await response.json()).toMatchObject({ title, status });
      }

      expect(await db.query.skillTable.findMany()).toEqual([skill]);
    });
  }
});
