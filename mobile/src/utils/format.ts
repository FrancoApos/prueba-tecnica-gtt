/** Timestamp corto para el listado de chats y los mensajes: hoy → hora, si no → fecha corta. */
export function formatRelativeTimestamp(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: isSameYear ? undefined : '2-digit',
  });
}

/** Etiqueta de separador de día para la conversación: "Hoy", "Ayer", o fecha larga. */
export function formatDayLabel(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';

  const isSameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: isSameYear ? undefined : 'numeric',
  });
}

export function getInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}
