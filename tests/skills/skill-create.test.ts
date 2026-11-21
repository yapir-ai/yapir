import { userRow } from "@test/kit/factories/user";
import { expect, test } from "@test/kit/test";

test("creates a skill that the current user authors", async ({ page, db }) => {
  const skill = {
    name: "code-review",
    description: "Review a pull request.",
    instructions: "Read the diff, then comment.",
  };

  await page.goto("/skills/create");
  await page.getByLabel("Name").fill(skill.name);
  await page.getByLabel("Description").fill(skill.description);
  await page.getByLabel("Instructions").fill(skill.instructions);
  await page.getByRole("button", { name: "Create skill" }).click();
  await expect(page).toHaveURL(/\/skills\/[\da-f-]{36}$/u);

  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(await db.query.skillTable.findFirst({ where: { id } })).toEqual({
    id,
    ...skill,
    authorId: userRow().id,
    deletedAt: null,
  });
});

test.describe("refuses a skill", () => {
  const valid = {
    name: "code-review",
    description: "Review a pull request.",
    instructions: "Read the diff, then comment.",
  };

  const cases = [
    { name: "with an uppercase name", body: { ...valid, name: "Code" } },
    {
      name: "with a name above 64 characters",
      body: { ...valid, name: "a".repeat(65) },
    },
    { name: "with a blank description", body: { ...valid, description: "  " } },
    { name: "with a blank instructions", body: { ...valid, instructions: "" } },
    {
      name: "with an unknown field",
      body: { ...valid, authorId: userRow().id },
    },
    { name: "with an ID that is not a UUID", body: { ...valid, id: "skill" } },
  ] as const;

  for (const { name, body } of cases) {
    test(name, async ({ page, db }) => {
      const response = await page.request.post("/api/skills", { data: body });

      expect(response.status()).toBe(400);
      expect(await db.query.skillTable.findMany()).toEqual([]);
    });
  }
});
