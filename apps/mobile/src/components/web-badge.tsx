import { version } from 'expo/package.json';
import { Image } from 'expo-image';
import { StyleSheet, useColorScheme } from 'react-native';
import { Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function WebBadge() {
  const scheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText
        style={styles.versionText}
        themeColor="textSecondary"
        type="code"
      >
        v{version}
      </ThemedText>
      <Image
        source={
          scheme === 'dark'
            ? require('@/assets/images/expo-badge-white.png')
            : require('@/assets/images/expo-badge.png')
        }
        style={styles.badgeImage}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badgeImage: {
    aspectRatio: 123 / 24,
    width: 123,
  },
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  versionText: {
    textAlign: 'center',
  },
});
