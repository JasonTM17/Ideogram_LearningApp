export interface WorkerHealthReport {
  service: 'ideogram-worker';
  status: 'ready';
  timestamp: string;
}

export const createWorkerHealthReport = (now = new Date()): WorkerHealthReport => ({
  service: 'ideogram-worker',
  status: 'ready',
  timestamp: now.toISOString(),
});
