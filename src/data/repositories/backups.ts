import type { StoredBackup } from "../contracts";
export const BACKUP_KEY = "volleyworld-backups";
/** Parsing errors intentionally reach the caller's existing recovery UI. */
export function readBackups(storage: Storage): StoredBackup[] {
  return JSON.parse(storage.getItem(BACKUP_KEY) || "[]") as StoredBackup[];
}
export function addBackup(storage: Storage, backup: StoredBackup): void {
  const items = readBackups(storage);
  items.unshift(backup);
  storage.setItem(BACKUP_KEY, JSON.stringify(items.slice(0, 5)));
}
