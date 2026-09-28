import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  DEFAULT_USERS_SORT,
  UsersSortSheet,
  usersSortLabel,
  usersSortQuery,
} from '@/src/components/UsersSortSheet';

/**
 * Dos tests con `render` por archivo es el máximo que tolera esta combinación
 * de versiones (ver docs/DECISIONS.md, "bug de interop conocido en los tests
 * de sign-in"): un tercero rompe con "overlapping act() calls" aunque pase
 * aislado. Por eso el estado inicial se verifica dentro del primer test en vez
 * de montar la hoja una vez más.
 */
describe('UsersSortSheet', () => {
  const onApply = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onApply.mockReset();
    onClose.mockReset();
  });

  function renderSheet() {
    return render(
      <UsersSortSheet visible value={DEFAULT_USERS_SORT} onApply={onApply} onClose={onClose} />,
    );
  }

  it('abre con el orden aplicado preseleccionado y no aplica nada hasta tocar "Aplicar orden"', async () => {
    await renderSheet();

    expect(screen.getByTestId(`users-sort-option-${DEFAULT_USERS_SORT}`).props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    expect(screen.getByTestId('users-sort-option-recentlyActive').props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false }),
    );

    fireEvent.press(screen.getByTestId('users-sort-option-recentlyActive'));

    // Esperar a que la selección se vea en la UI no es decorativo: el `onPress`
    // de "Aplicar" captura el borrador del render en el que se lo consultó, así
    // que hay que dejar que React confirme el re-render antes de tocarlo.
    await waitFor(() =>
      expect(screen.getByTestId('users-sort-option-recentlyActive').props.accessibilityState).toEqual(
        expect.objectContaining({ checked: true }),
      ),
    );
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('users-sort-apply'));
    expect(onApply).toHaveBeenCalledWith('recentlyActive');
  });

  it('descarta la selección al cancelar', async () => {
    await renderSheet();

    fireEvent.press(screen.getByTestId('users-sort-option-nameDesc'));
    fireEvent.press(screen.getByTestId('users-sort-cancel'));

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('usersSortQuery', () => {
  // Estos pares son el contrato con el backend: tienen que existir en
  // `SORTABLE_FIELDS` de `QueryUsersDto`, o la request vuelve 400.
  it('traduce cada opción al par sortBy/sortOrder que espera la API', () => {
    expect(usersSortQuery('nameAsc')).toEqual({ sortBy: 'lastName', sortOrder: 'asc' });
    expect(usersSortQuery('nameDesc')).toEqual({ sortBy: 'lastName', sortOrder: 'desc' });
    expect(usersSortQuery('recentlyActive')).toEqual({ sortBy: 'lastSeenAt', sortOrder: 'desc' });
    expect(usersSortQuery('newest')).toEqual({ sortBy: 'createdAt', sortOrder: 'desc' });
  });

  it('el default del cliente coincide con el del backend (lastName asc), así el primer render no reordena', () => {
    expect(usersSortQuery(DEFAULT_USERS_SORT)).toEqual({ sortBy: 'lastName', sortOrder: 'asc' });
    expect(usersSortLabel(DEFAULT_USERS_SORT)).toBe('Nombre A–Z');
  });
});
