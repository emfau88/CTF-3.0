/** Shared by every production career writer, including team setup and results. */
export async function withCareerSaveLock<T>(write: () => T): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    throw new CareerSaveError("unsupported");
  }
  return navigator.locks.request("core-arena-career-save", () => write());
}

export type CareerSaveIssue = "corrupt" | "version" | "read" | "write" | "stale" | "unsupported";

export class CareerSaveError extends Error {
  constructor(readonly issue: CareerSaveIssue) {
    super(`Career save: ${issue}`);
    this.name = "CareerSaveError";
  }
}
