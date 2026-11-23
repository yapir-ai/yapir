import type {
  PgAsyncDatabase,
  PgAsyncTransaction,
  PgQueryResultHKT,
} from "drizzle-orm/pg-core";

export type Transaction = PgAsyncTransaction<PgQueryResultHKT>;

export interface Database<Tx extends Transaction = Transaction> extends Pick<
  PgAsyncDatabase<PgQueryResultHKT>,
  "select"
> {
  transaction: <T>(work: (tx: Tx) => Promise<T>) => Promise<T>;
}
