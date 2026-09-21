import snapshot from "../../data/processed/2026-2027-fall-snapshot-status.json";

export const publishedSnapshot = snapshot;

export function formatSnapshotTime(timestamp: string, language: "en" | "ar" = "en"): string {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-OM" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(timestamp));
}

export function formatSnapshotAge(timestamp: string, language: "en" | "ar" = "en"): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000));
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] = elapsedMinutes < 60
    ? [elapsedMinutes, "minute"]
    : elapsedMinutes < 1_440
      ? [Math.floor(elapsedMinutes / 60), "hour"]
      : [Math.floor(elapsedMinutes / 1_440), "day"];

  return new Intl.RelativeTimeFormat(language === "ar" ? "ar-OM" : "en-GB", { numeric: "always" }).format(-value, unit);
}
