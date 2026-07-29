import { createHealthResponse } from '@ideogram/contracts';

export const runtime = 'nodejs';

export const GET = () => Response.json(createHealthResponse());
