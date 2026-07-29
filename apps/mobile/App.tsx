import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { editorialTokens } from '@ideogram/design-tokens';

import { mobileFoundation } from './src/mobile-foundation';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{mobileFoundation.stage}</Text>
      <Text style={styles.title}>{mobileFoundation.name}</Text>
      <Text style={styles.copy}>{mobileFoundation.description}</Text>
      <Text style={styles.notice}>
        Sắp có: placement, lesson, SRS, AI tutor, luyện nói/viết và offline sync.
      </Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: editorialTokens.color.paper,
    gap: editorialTokens.space[4],
    justifyContent: 'center',
    padding: editorialTokens.space[6],
  },
  copy: {
    color: editorialTokens.color.ink,
    fontSize: 17,
    lineHeight: 26,
  },
  eyebrow: {
    color: editorialTokens.color.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  notice: {
    backgroundColor: editorialTokens.color.sage,
    borderRadius: editorialTokens.radius.card,
    color: editorialTokens.color.ink,
    fontSize: 15,
    lineHeight: 23,
    padding: editorialTokens.space[4],
  },
  title: {
    color: editorialTokens.color.ink,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
});
