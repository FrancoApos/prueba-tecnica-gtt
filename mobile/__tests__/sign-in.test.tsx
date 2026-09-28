import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SignInScreen from '@/app/sign-in';
import { useSessionStore } from '@/src/store/session';

jest.mock('@/src/store/session', () => ({
  useSessionStore: jest.fn(),
}));

describe('SignInScreen', () => {
  const loginMock = jest.fn();
  const clearSessionExpiredMessageMock = jest.fn();

  beforeEach(() => {
    loginMock.mockReset();
    clearSessionExpiredMessageMock.mockReset();
    (useSessionStore as unknown as jest.Mock).mockImplementation(
      (
        selector: (state: {
          login: typeof loginMock;
          sessionExpiredMessage: string | null;
          clearSessionExpiredMessage: typeof clearSessionExpiredMessageMock;
        }) => unknown,
      ) =>
        selector({
          login: loginMock,
          sessionExpiredMessage: null,
          clearSessionExpiredMessage: clearSessionExpiredMessageMock,
        }),
    );
  });

  it('shows validation errors instead of calling login when fields are empty', async () => {
    await render(<SignInScreen />);

    fireEvent.press(screen.getByTestId('submit-button'));

    expect(await screen.findByText('Ingresá tu email')).toBeTruthy();
    expect(screen.getByText('Ingresá tu contraseña')).toBeTruthy();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('calls login with the entered credentials on a valid submit', async () => {
    loginMock.mockResolvedValue(undefined);
    await render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'ana@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Sup3rSecret!');
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('ana@example.com', 'Sup3rSecret!'));
  });
});
