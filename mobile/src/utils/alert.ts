import { Alert } from 'react-native';

export interface Choice {
  label: string;
  onPress: () => void;
}

/** Aviso simple de una sola acción. */
export function showAlert(title: string, message: string): void {
  Alert.alert(title, message);
}

/**
 * Menú de acciones con cancelación. La variante web vive en `alert.web.ts`:
 * el `Alert` de react-native-web es un no-op (`static alert() {}`), así que
 * sin ese split los menús quedarían muertos al correr la app en el browser.
 */
export function showChoice(title: string, message: string, choices: Choice[]): void {
  Alert.alert(title, message, [
    ...choices.map((choice) => ({ text: choice.label, onPress: choice.onPress })),
    { text: 'Cancelar', style: 'cancel' as const },
  ]);
}
