// Shared UnsyncedPayload type for useDataStore and unsynced logic
export type UnsyncedPayload = {
  id?: string;
  type?: string;
  [key: string]: unknown;
};
