export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Besok";
  if (diffDays === -1) return "Kemarin";
  if (diffDays > 0 && diffDays <= 7) return `${diffDays} hari lagi`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} hari lalu`;

  return formatDate(d);
}

/** "8 Desember 2026 pukul 17.54", plus "(3 hari lagi)" only when the date is within a week. */
export function formatDeadline(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const relative = formatRelativeTime(d);
  return relative === formatDate(d) ? formatDateTime(d) : `${formatDateTime(d)} (${relative})`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function fileSizeToString(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateEnrollmentKey(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (const val of randomValues) {
    key += chars[val % chars.length];
  }
  return key;
}

/**
 * Value for an <input type="datetime-local">: the wall-clock time where the browser is.
 * `toISOString().slice(0, 16)` would show UTC instead (16.59 for a 23.59 deadline in WIB).
 */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * A datetime-local value as an absolute moment ("…Z"). Sent to the backend, so a deadline
 * of 23.59 WIB is enforced at 23.59 WIB and not at 23.59 on the server's clock.
 */
export function dateTimeLocalToISO(value: string): string {
  return new Date(value).toISOString();
}

// Must match MAX_FILE_SIZE_MB on the backend. Lab reports with figures are often well over 10MB.
export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_FILE_TYPES = {
  PDF: ["application/pdf"],
  DOCX: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
} as const;
