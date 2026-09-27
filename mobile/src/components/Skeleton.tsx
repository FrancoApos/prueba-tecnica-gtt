import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/src/theme/tokens';

function Skeleton({ style }: { style?: ViewStyle }) {
  // useState (no useRef) porque leer `.current` de un ref durante el render
  // está prohibido por la regla react-hooks/refs — este valor no cambia, así
  // que el setter de useState nunca se usa, solo se aprovecha su init perezoso.
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, style, { opacity }]} />;
}

interface SkeletonRowsProps {
  count?: number;
  avatarSize?: number;
  rowHeight?: number;
}

/** Filas placeholder (avatar + 2 líneas) para el estado de carga de listados con avatar — Chats y Users. */
export function SkeletonRows({ count = 6, avatarSize = 52, rowHeight = 76 }: SkeletonRowsProps) {
  return (
    <View testID="skeleton-loading">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.row, { height: rowHeight }]}>
          <Skeleton style={{ width: avatarSize, height: avatarSize, borderRadius: radii.pill }} />
          <View style={styles.lines}>
            <Skeleton style={styles.lineWide} />
            <Skeleton style={styles.lineNarrow} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.control,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  lines: {
    flex: 1,
    gap: spacing.sm,
  },
  lineWide: {
    height: 14,
    width: '55%',
  },
  lineNarrow: {
    height: 12,
    width: '35%',
  },
});
