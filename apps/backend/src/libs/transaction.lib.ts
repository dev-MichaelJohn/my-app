import type { PgDatabase, PgTransaction } from "@/configs/db.config.js";
import db from "@/configs/db.config.js";
import type { ResultAsync } from "neverthrow";
import { AppError } from "./error.lib.js";
import { FromDbPromise } from "./result.lib.js";

export type DbClient = PgDatabase | PgTransaction;

export const WithTransaction = <T>(
  client: DbClient = db,
  callback: (tx: PgTransaction) => Promise<T>,
): ResultAsync<T, AppError> => {
  const isAlreadyTransaction = !("transaction" in client);

  const execution = isAlreadyTransaction
    ? callback(client as PgTransaction)
    : (client as PgDatabase).transaction(async (tx) => {
        return callback(tx as PgTransaction);
      });

  return FromDbPromise(execution);
};
