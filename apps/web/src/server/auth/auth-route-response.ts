const noStoreHeaders = (requestId: string): HeadersInit => ({
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  Expires: '0',
  Pragma: 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Request-Id': requestId,
});

export const redirectNoStore = (
  location: string,
  {
    headers,
    requestId,
    status = 303,
  }: { headers?: HeadersInit; requestId: string; status?: 302 | 303 | 307 | 308 },
): Response => {
  const responseHeaders = new Headers(headers);

  for (const [name, value] of Object.entries(noStoreHeaders(requestId))) {
    responseHeaders.set(name, value);
  }

  responseHeaders.set('Location', location);

  return new Response(null, {
    headers: responseHeaders,
    status,
  });
};
