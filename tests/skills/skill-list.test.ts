import { skillRow } from "@test/kit/factories/skill";
import { userRow } from "@test/kit/factories/user";
import { expect, test } from "@test/kit/test";

test("lists the skills with their author, by name, without the deleted ones", async ({
  page,
  insert,
}) => {
  const admin = userRow();

  const [triage, review] = await insert(skillRow, [
    {
      id: "01960000-0000-7000-8000-000000000602",
      name: "triage-issues",
      description: "Label and route new issues.",
      authorId: admin.id,
    },
    { authorId: admin.id },
    {
      id: "01960000-0000-7000-8000-000000000603",
      name: "release-notes",
      authorId: admin.id,
      deletedAt: new Date("2026-09-03T09:00:00Z"),
    },
  ]);

  await page.goto("/skills");

  await expect(page.getByRole("table")).toMatchAriaSnapshot(`
    - rowgroup
    - rowgroup:
      - /children: equal
      - row "${review.name} ${review.description} ${admin.name} Copy install prompt"
      - row "${triage.name} ${triage.description} ${admin.name} Copy install prompt"
  `);
});

test("filters the skills by ID and orders them", async ({ page, insert }) => {
  const admin = userRow();

  const [review, triage] = await insert(skillRow, [
    { authorId: admin.id },
    {
      id: "01960000-0000-7000-8000-000000000602",
      name: "triage-issues",
      authorId: admin.id,
    },
    {
      id: "01960000-0000-7000-8000-000000000603",
      name: "release-notes",
      authorId: admin.id,
    },
  ]);

  const query = new URLSearchParams([
    ["id", review.id],
    ["id", triage.id],
    ["order", "asc"],
  ]);

  const response = await page.request.get(`/api/skills?${query.toString()}`);

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    items: [
      { ...review, deletedAt: null },
      { ...triage, deletedAt: null },
    ],
  });
});

test.describe("refuses a request", () => {
  const cases = [
    { name: "with a limit above 100", path: "/api/skills?limit=101" },
    { name: "with a negative offset", path: "/api/skills?offset=-1" },
    { name: "with an ID that is not a UUID", path: "/api/skills?id=skill" },
    { name: "with an unknown order", path: "/api/skills?order=random" },
  ] as const;

  for (const { name, path } of cases) {
    test(name, async ({ page }) => {
      const response = await page.request.get(path);

      expect(response.status()).toBe(400);
    });
  }

  test("without a session", async ({ request }) => {
    const response = await request.get("/api/skills");

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({
      title: "UNAUTHENTICATED",
      status: 401,
      detail: "Sign in to access this resource",
    });
  });
});
