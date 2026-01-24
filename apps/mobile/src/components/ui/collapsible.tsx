import { type PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({
  children,
  title,
}: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  return (
    <ThemedView>
      <Pressable
        onPress={() => setIsOpen((value) => !value)}
        style={({ pressed }) => [
          styles.heading,
          pressed && styles.pressedHeading,
        ]}
      >
        <ThemedView style={styles.button} type="backgroundElement">
          <IconSymbol
            color={theme.text}
            name="chevron.right"
            size={14}
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
            weight="bold"
          />
        </ThemedView>

        <ThemedText type="small">{title}</ThemedText>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedView style={styles.content} type="backgroundElement">
            {children}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    height: Spacing.four,
    justifyContent: 'center',
    width: Spacing.four,
  },
  content: {
    borderRadius: Spacing.three,
    marginLeft: Spacing.four,
    marginTop: Spacing.three,
    padding: Spacing.four,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressedHeading: {
    opacity: 0.7,
  },
});
