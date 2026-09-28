import { z } from 'zod';

/** Formato con el que se muestra y se tipea la fecha en los formularios. */
export const DATE_FORMAT_HINT = 'DD-MM-YYYY';

const DISPLAY_DATE = /^(\d{2})-(\d{2})-(\d{4})$/;

/**
 * Fecha del backend (`1995-03-20T00:00:00.000Z`) → `20-03-1995`.
 *
 * Se corta el ISO en vez de pasar por `new Date`: el backend guarda la fecha a
 * medianoche UTC, así que interpretarla en la zona local adelantaría o atrasaría
 * un día a quien esté al oeste de Greenwich (en Argentina, UTC-3, todas las
 * fechas se verían un día antes).
 */
export function toDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return '';
  return `${day}-${month}-${year}`;
}

/**
 * `20-03-1995` del formulario → `1995-03-20` para la API.
 *
 * El contrato HTTP sigue siendo ISO 8601 (el backend valida con `@IsDateString`
 * y Mongo guarda un `Date`): DD-MM-YYYY es solo la capa de presentación, que es
 * donde el orden día-mes-año es la convención local.
 */
export function toApiDate(displayDate: string): string {
  const match = DISPLAY_DATE.exec(displayDate.trim());
  if (!match) return displayDate;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/** Valida el formato y además que la fecha exista: `31-02-1995` no pasa. */
export function isValidDisplayDate(value: string): boolean {
  const match = DISPLAY_DATE.exec(value.trim());
  if (!match) return false;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  );
}

/**
 * Campo compartido por los tres formularios que piden fecha de nacimiento
 * (alta de usuario, edición de usuario y perfil propio), para que el formato y
 * su mensaje de error no se dupliquen en cada pantalla.
 */
export const birthDateField = z
  .string()
  .min(1, 'Requerido')
  .regex(DISPLAY_DATE, `Formato ${DATE_FORMAT_HINT}`)
  .refine(isValidDisplayDate, 'Esa fecha no existe');
