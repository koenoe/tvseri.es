import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type HintRowProps = {
  title?: string;
  hint?: string;
};

export function HintRow({
  title = 'Try editing',
  hint = 'app/index.tsx',
}: HintRowProps) {
  return (
    <View style={styles.stepRow}>
      <ThemedText type="small">{title}</ThemedText>
      <ThemedView style={styles.codeSnippet} type="backgroundSelected">
        <ThemedText themeColor="textSecondary" type="code">
          {hint}
        </ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  codeSnippet: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
