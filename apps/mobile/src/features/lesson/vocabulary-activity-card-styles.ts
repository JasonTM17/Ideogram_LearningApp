import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { StyleSheet } from 'react-native';

export const vocabularyActivityCardStyles = StyleSheet.create({
  confirmation: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[4],
  },
  confirmationHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[3],
  },
  copy: { flex: 1, gap: nativeLayoutTokens.spacing[2], minWidth: 0 },
  entries: { gap: nativeLayoutTokens.spacing[3] },
  entry: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[2],
    padding: nativeLayoutTokens.spacing[4],
  },
  example: {
    gap: nativeLayoutTokens.spacing[1],
    marginTop: nativeLayoutTokens.spacing[2],
    padding: nativeLayoutTokens.spacing[3],
  },
  exampleValue: { fontSize: 18, lineHeight: 28 },
  header: { gap: nativeLayoutTokens.spacing[2] },
  instruction: {
    alignItems: 'flex-start',
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[3],
    padding: nativeLayoutTokens.spacing[4],
  },
  primaryAction: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[2],
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
  },
  reading: { fontSize: 18, lineHeight: 28 },
  secondaryAction: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
  },
  term: { fontSize: 42, fontWeight: '700', lineHeight: 52 },
});
