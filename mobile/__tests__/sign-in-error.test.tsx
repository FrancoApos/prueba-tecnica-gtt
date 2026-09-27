import { fireEvent, render, screen } from '@testing-library/react-native';
import SignInScreen from '@/app/sign-in';
import { ApiError } from '@/src/api/client';
import { useSessionStore } from '@/src/store/session';

// Separado de sign-in.test.tsx a propósito: ejercitar un submit exitoso y
// uno rechazado en el mismo archivo dejaba estado global de act() de RNTL
// contaminado entre tests (bug de interop de esta combinación de versiones,
// no del código de la app — cada test pasa solo). Jest aísla el registro de
// módulos por archivo, así que separarlos evita el problema sin parches frágiles.
jest.mock('@/src/store/session', () => ({
  useSessionStore: jest.fn(),
}));

describe('SignInScreen — credenciales inválidas', () => {
  it('shows a friendly message when the backend rejects the credentials', async () => {
    const loginMock = jest.fn().mockRejectedValue(
      new ApiError({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Credenciales inválidas',
        path: '/auth/login',
        timestamp: new Date().toISOString(),
      }),
    );
    (useSessionStore as unknown as jest.Mock).mockImplementation(
      (
        selector: (state: {
          login: typeof loginMock;
          sessionExpiredMessage: string | null;
          clearSessionExpiredMessage: () => void;
        }) => unknown,
      ) =>
        selector({ login: loginMock, sessionExpiredMessage: null, clearSessionExpiredMessage: jest.fn() }),
    );

    await render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'ana@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'incorrecta1');
    fireEvent.press(screen.getByTestId('submit-button'));

    const errorBanner = await screen.findByTestId('login-error');
    expect(errorBanner).toHaveTextContent('Email o contraseña incorrectos');
  });
});
