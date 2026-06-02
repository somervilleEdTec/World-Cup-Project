/** UK wall-clock time; label always shown as BST per product requirement. */
const UK_TIMEZONE = 'Europe/London';

export function formatKickoffBst(iso: string): string {
  const formatted = new Date(iso).toLocaleString('en-GB', {
    timeZone: UK_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${formatted} BST`;
}

export function formatOptionalKickoffBst(iso: string | null | undefined): string {
  if (!iso) return 'n/a';
  return formatKickoffBst(iso);
}
