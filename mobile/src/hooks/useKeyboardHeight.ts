import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent } from 'react-native';

/**
 * Alto del teclado en pantalla (0 mientras está oculto), para que una barra
 * pegada al borde inferior pueda dejarle ese lugar.
 *
 * `KeyboardAvoidingView` no alcanza cuando la pantalla tiene header nativo:
 * mide su propio frame con `onLayout`, o sea relativo al padre, así que la `y`
 * le da 0 aunque en pantalla arranque debajo del header. El padding que calcula
 * queda corto justo en el alto del header y hay que compensarlo a mano con
 * `keyboardVerticalOffset` — un número que depende del header (acá es custom,
 * con avatar) y del notch del equipo, y por eso cualquier constante termina
 * fallando en algún teléfono: con 90 fijo, en el iPhone de prueba el teclado
 * tapaba la barra de escribir.
 *
 * El alto del teclado, en cambio, ya viene medido contra la pantalla, así que
 * no depende de nada de lo que haya arriba.
 *
 * Solo iOS: en Android el sistema redimensiona la ventana (`adjustResize`) y
 * sumar padding acá lo duplicaría.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    // `willShow`/`willHide` (y no `did*`) para arrancar la animación junto con
    // la del teclado, en vez de que la barra salte una vez que ya terminó.
    const show = Keyboard.addListener('keyboardWillShow', (event) => {
      animateWithKeyboard(event);
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (event) => {
      animateWithKeyboard(event);
      setHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/** Copia la duración y la curva del teclado para que el layout lo acompañe. */
function animateWithKeyboard({ duration, easing }: KeyboardEvent) {
  if (!duration || !easing) return;
  // `LayoutAnimation` rechaza duraciones muy cortas (ver RCTLayoutAnimation.m).
  const safeDuration = Math.max(duration, 10);
  LayoutAnimation.configureNext({
    duration: safeDuration,
    update: { duration: safeDuration, type: LayoutAnimation.Types[easing] ?? 'keyboard' },
  });
}
