import { describe, expect, it } from 'vitest';

import { createSessionBoundRequestSignal } from './session-bound-request-signal';

describe('createSessionBoundRequestSignal', () => {
  it('aborts the request when its source session changes', () => {
    const sessionController = new AbortController();
    const request = createSessionBoundRequestSignal(sessionController.signal);

    sessionController.abort();

    expect(request.signal.aborted).toBe(true);
  });

  it('aborts a request when the owning screen disposes it', () => {
    const request = createSessionBoundRequestSignal(new AbortController().signal);

    request.dispose();

    expect(request.signal.aborted).toBe(true);
  });

  it('starts aborted when an older session signal is already closed', () => {
    const sessionController = new AbortController();
    sessionController.abort();

    expect(createSessionBoundRequestSignal(sessionController.signal).signal.aborted).toBe(true);
  });
});
