import { skillRow } from "@test/kit/factories/skill";
import { userRow } from "@test/kit/factories/user";
import { expect, test } from "@test/kit/test";

test("returns the skill, even when it is deleted", async ({ page, insert }) => {
  const skill = await insert(skillRow, {
    authorId: userRow().id,
    deletedAt: new Date("2026-09-03T09:00:00Z"),
  });

  const response = await page.request.get(`/api/skills/${skill.id}`);

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    ...skill,
    deletedAt: "2026-09-03T09:00:00.000Z",
  });
});

test.describe("refuses a request", () => {
  const cases = [
    {
      name: "for a skill that does not exist",
      id: "01960000-0000-7000-8000-000000000999",
      status: 404,
    },
    { name: "with an ID that is not a UUID", id: "skill", status: 400 },
  ] as const;

  for (const { name, id, status } of cases) {
    test(name, async ({ page }) => {
      const response = await page.request.get(`/api/skills/${id}`);

      expect(response.status()).toBe(status);

      if (status === 404) {
        expect(await response.json()).toEqual({
          title: "SKILL_NOT_FOUND",
          status: 404,
          detail: "Skill could not be found",
        });
      }
    });
  }
});
