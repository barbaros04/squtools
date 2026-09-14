import snapshot from "../../data/processed/2026-2027-fall-snapshot-status.json";

export const publishedSnapshot = snapshot;

export function formatSnapshotTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(timestamp));
}
