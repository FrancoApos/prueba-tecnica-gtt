import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import ProfileScreen from '@/app/(app)/(tabs)/profile';
import { deleteAvatar, uploadAvatar } from '@/src/api/users';
import { useSessionStore } from '@/src/store/session';
import type { User } from '@/src/types/api';

jest.mock('@/src/store/session', () => ({ useSessionStore: jest.fn() }));
jest.mock('@/src/api/users', () => ({
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const baseUser: User = {
  id: 'user-1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'García',
  birthDate: '1995-03-20T00:00:00.000Z',
  phone: '+5491122334455',
  avatarUrl: null,
  status: 'offline',
  lastSeenAt: null,
  role: 'user',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

/**
 * La foto de perfil se sube como archivo por su propio endpoint, no como un
 * campo del formulario: estos tests fijan ese contrato (se sube al elegirla,
 * sin pasar por "Guardar cambios") y el manejo del permiso denegado.
 */
describe('ProfileScreen — foto de perfil', () => {
  const updateSessionUser = jest.fn();

  function mockSession(user: User) {
    (useSessionStore as unknown as jest.Mock).mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) =>
        selector({ user, updateUser: updateSessionUser, logout: jest.fn() }),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession(baseUser);
  });

  it('sube la foto elegida sin pasar por "Guardar cambios"', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/foto.jpg', fileName: 'foto.jpg', mimeType: 'image/jpeg' }],
    });
    const subido = { ...baseUser, avatarUrl: '/uploads/avatars/abc.jpg' };
    (uploadAvatar as jest.Mock).mockResolvedValue(subido);

    await render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('avatar-picker'));

    await waitFor(() =>
      expect(uploadAvatar).toHaveBeenCalledWith('user-1', {
        uri: 'file:///tmp/foto.jpg',
        name: 'foto.jpg',
        mimeType: 'image/jpeg',
      }),
    );
    expect(updateSessionUser).toHaveBeenCalledWith(subido);
  });

  it('no sube nada si el usuario no da permiso a sus fotos', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    await render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('avatar-picker'));

    await waitFor(() => expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled());
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('ofrece quitar la foto solo cuando hay una, y la quita por el endpoint dedicado', async () => {
    const { unmount } = await render(<ProfileScreen />);
    // Sin foto no hay nada que quitar: el botón no existe.
    expect(screen.queryByTestId('remove-avatar-button')).toBeNull();
    unmount();

    mockSession({ ...baseUser, avatarUrl: '/uploads/avatars/abc.jpg' });
    (deleteAvatar as jest.Mock).mockResolvedValue(baseUser);

    await render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('remove-avatar-button'));

    await waitFor(() => expect(deleteAvatar).toHaveBeenCalledWith('user-1'));
    expect(updateSessionUser).toHaveBeenCalledWith(baseUser);
  });
});
