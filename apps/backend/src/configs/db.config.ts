import env from "./env.config.js";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { EmptyRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgAsyncTransaction } from "drizzle-orm/pg-core";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const db = drizzle({ client: pool });
export type PgDatabase = typeof db;
export type PgTransaction = PgAsyncTransaction<NodePgQueryResultHKT, EmptyRelations>;

export default db;
