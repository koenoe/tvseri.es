import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText style={styles.title} type="title">
            Welcome to&nbsp;Expo
          </ThemedText>
        </ThemedView>

        <ThemedText style={styles.code} type="code">
          get started
        </ThemedText>

        <ThemedView style={styles.stepContainer} type="backgroundElement">
          <HintRow hint="src/app/index.tsx" title="Try editing" />
          <HintRow hint="cmd+d" title="Dev tools" />
          <HintRow hint="npm reset project" title="Fresh start" />
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  code: {
    textTransform: 'uppercase',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.four,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  safeArea: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  stepContainer: {
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
});
