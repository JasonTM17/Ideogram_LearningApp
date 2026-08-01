import type { DeepSeekTutorConfiguration } from './deepseek-tutor-configuration';
import type { TutorTurnUsage } from '@ideogram/contracts';

/**
 * Calculates an integer micro-USD estimate from provider token usage.
 * Prices are injected configuration, so a provider price change never requires
 * a code change or a silent redeploy with stale economics.
 */
export const calculateTutorTurnCostMicrousd = ({
  configuration,
  usage,
}: {
  configuration: DeepSeekTutorConfiguration;
  usage: TutorTurnUsage;
}): number => {
  const inputCost =
    (usage.promptTokens * configuration.inputPriceMicrousdPerMillionTokens) / 1_000_000;
  const outputCost =
    (usage.completionTokens * configuration.outputPriceMicrousdPerMillionTokens) / 1_000_000;

  return Math.ceil(inputCost + outputCost);
};
