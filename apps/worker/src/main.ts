import { createWorkerHealthReport } from './worker-health';
import {
  createPlacementScoringWorkerFromEnvironment,
  drainPlacementScoringJobs,
} from './placement-scoring-worker';
import { createSingleFlightRunner } from './single-flight-runner';

const health = createWorkerHealthReport();

console.log(`${health.service} is ${health.status}.`);

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
    void run().catch(() => {
      console.error('placement scoring cycle failed.');
    });
    setInterval(() => {
      void run().catch(() => {
        console.error('placement scoring cycle failed.');
      });
    }, pollIntervalMs);
  } catch {
    console.error('placement scoring worker could not start.');
    process.exitCode = 1;
  }
}
