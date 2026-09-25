import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/src/theme';
import { getInitials } from '@/src/utils/format';
import type { ConnectionStatus } from '@/src/types/api';

interface AvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  status?: ConnectionStatus;
  size?: number;
}

export function Avatar({ firstName, lastName, avatarUrl, status, size = 48 }: AvatarProps) {
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.container, dimensionStyle]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={[styles.image, dimensionStyle]} />
      ) : (
        <View style={[styles.fallback, dimensionStyle]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{getInitials(firstName, lastName)}</Text>
        </View>
      )}
      {status && (
        <View
          style={[
            styles.statusDot,
            { backgroundColor: status === 'online' ? colors.online : colors.offline },
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
    color: colors.primaryText,
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
