import { Image, StyleSheet, Text, View } from 'react-native';
import { resolveAssetUrl } from '@/src/config';
import { colors, sizes } from '@/src/theme/tokens';
import { getInitials } from '@/src/utils/format';
import type { ConnectionStatus } from '@/src/types/api';

interface AvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  status?: ConnectionStatus;
  size?: number;
}

export function Avatar({ firstName, lastName, avatarUrl, status, size = sizes.avatarListRow }: AvatarProps) {
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.container, dimensionStyle]}>
      {avatarUrl ? (
        // El backend guarda la foto como path relativo (`/uploads/avatars/…`),
        // igual que los adjuntos; `resolveAssetUrl` le antepone el host de la
        // API y deja pasar tal cual una URI local del picker (vista previa
        // optimista antes de que termine la subida).
        <Image source={{ uri: resolveAssetUrl(avatarUrl) }} style={[styles.image, dimensionStyle]} />
      ) : (
        <View style={[styles.fallback, dimensionStyle]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{getInitials(firstName, lastName)}</Text>
        </View>
      )}
      {status && (
        <View
          style={[
            styles.statusDot,
            { backgroundColor: status === 'online' ? colors.success : colors.offline },
          ]}
          testID="status-dot"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: sizes.statusDot,
    height: sizes.statusDot,
    borderRadius: sizes.statusDot / 2,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
