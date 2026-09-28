/**
 * Variante web de `alert.ts` (ver ahí el por qué del split).
 *
 * El browser no tiene un diálogo de múltiples botones nativo, así que el menú
 * se degrada a confirmaciones en cadena: se pregunta por cada opción en orden
 * y gana la primera aceptada; si se rechazan todas equivale a cancelar.
 */
export interface Choice {
  label: string;
  onPress: () => void;
  /** Existe para igualar la firma de `alert.ts`; el browser no lo usa. */
  style?: 'destructive';
}

export function showAlert(title: string, message: string): void {
  globalThis.alert(`${title}\n\n${message}`);
}

export function showChoice(title: string, message: string, choices: Choice[]): void {
  for (const choice of choices) {
    if (globalThis.confirm(`${title}\n\n${message}\n\n¿${choice.label}?`)) {
      choice.onPress();
      return;
    }
  }
}
