import type { Db } from "@server/lib/db";
import type { PgTable } from "drizzle-orm/pg-core";

// A row factory, with the table that holds its rows.
type Factory<Input, Row> = ((input: Input) => Row) & { table: PgTable };

const isList = <Input>(
  input: Input | readonly Input[] | undefined
): input is readonly Input[] => Array.isArray(input);

// Inserts the rows that factories build, and returns them.
export function inserter(db: Db) {
  async function insert<Input, Row, Inputs extends Input[]>(
    factory: Factory<Input, Row>,
    inputs: [...Inputs]
  ): Promise<{ [Index in keyof Inputs]: Row }>;
  async function insert<Input, Row>(
    factory: Factory<Input, Row>,
    input?: Input
  ): Promise<Row>;
  async function insert<Input, Row>(
    factory: Factory<Input | undefined, Row>,
    input?: Input | readonly Input[]
  ) {
    const rows = isList(input)
      ? input.map((each) => factory(each))
      : [factory(input)];

    await db.insert(factory.table).values(rows);

    return isList(input) ? rows : rows[0];
  }

  return insert;
}
