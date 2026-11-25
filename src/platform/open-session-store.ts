import { openDatabaseAsync } from 'expo-sqlite';
import type { SessionWrite } from '../game/persistence';
import { SESSION_DATABASE, SqliteSessionStore } from './session-store';

let opening: Promise<SqliteSessionStore> | undefined;

export function openSessionStore() {
  opening ??= openDatabaseAsync(SESSION_DATABASE)
    .then(async (db) => {
      try {
        return await SqliteSessionStore.initialize(db);
      } catch (error) {
        await db.closeAsync();
        throw error;
      }
    })
    .catch((error: unknown) => {
      opening = undefined;
      throw error;
    });
  return opening;
}

export const sessionStorage = {
  commit: async (write: SessionWrite) =>
    (await openSessionStore()).commit(write),
};
