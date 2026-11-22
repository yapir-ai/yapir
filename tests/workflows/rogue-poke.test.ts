import { expect, test } from "@test/kit/test";

test("a run() that breaks a rule of the engine fails its call and writes nothing", async ({
  request,
  db,
}) => {
  for (const fault of ["two waits", "a foreign await"]) {
    const response = await request.post(
      "/api/probes/rogues/01960000-0000-7000-8000-000000000904/poke",
      { data: { fault } }
    );

    expect({ fault, status: response.status() }).toEqual({
      fault,
      status: 500,
    });
  }

  expect(await db.query.workflowTable.findMany()).toEqual([]);
});
