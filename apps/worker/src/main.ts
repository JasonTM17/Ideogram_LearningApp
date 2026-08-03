import {
  createPlacementScoringWorkerFromEnvironment,
  drainPlacementScoringJobs,
} from './placement-scoring-worker';
import { createSingleFlightRunner } from './single-flight-runner';

if (process.env.PLACEMENT_SCORING_WORKER_ENABLED === 'true') {
  try {
    const { client, workerId } = createPlacementScoringWorkerFromEnvironment();
    const pollIntervalMs = Number(process.env.PLACEMENT_SCORING_POLL_INTERVAL_MS ?? 15_000);
    if (
      !Number.isSafeInteger(pollIntervalMs) ||
      pollIntervalMs < 1_000 ||
      pollIntervalMs > 300_000
    ) {
      throw new Error('Placement worker poll interval is invalid.');
    }
    const run = createSingleFlightRunner(async () => {
      const completed = await drainPlacementScoringJobs(client, workerId);
      if (completed > 0) console.log(`placement scoring completed ${completed} job(s).`);
    });
    setInterval(() => {
      void run().catch(() => {
        console.error('placement scoring cycle failed.');
      });
    }, pollIntervalMs);
    console.log('placement scoring polling started.');
    void run().catch(() => {
      console.error('placement scoring cycle failed.');
    });
  } catch {
    console.error('placement scoring worker could not start.');
    process.exitCode = 1;
  }
} else {
  console.log('placement scoring worker is disabled.');
}
