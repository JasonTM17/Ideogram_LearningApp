import { createWorkerHealthReport } from './worker-health';

const health = createWorkerHealthReport();

console.log(`${health.service} is ${health.status}.`);
