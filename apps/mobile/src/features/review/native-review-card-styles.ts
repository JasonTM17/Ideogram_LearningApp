import { StyleSheet } from 'react-native';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';

export const styles = StyleSheet.create({
  answer: {
    borderRadius: nativeLayoutTokens.radius.control,
    gap: nativeLayoutTokens.spacing[2],
    padding: nativeLayoutTokens.spacing[3],
  },
  card: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[4],
  },
  choice: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    flex: 1,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[2],
  },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: nativeLayoutTokens.spacing[2] },
  choicesHeading: { gap: nativeLayoutTokens.spacing[1] },
  feedback: {
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[3],
    padding: nativeLayoutTokens.spacing[3],
  },
  outlineButton: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    minHeight: nativeLayoutTokens.touchTarget.android,
    justifyContent: 'center',
    paddingHorizontal: nativeLayoutTokens.spacing[3],
  },
  prompt: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    gap: nativeLayoutTokens.spacing[3],
    padding: nativeLayoutTokens.spacing[4],
  },
  stop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[2],
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
  },
  term: { textAlign: 'center' },
});
