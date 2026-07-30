'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { normalizeWebAuthReturnPath } from '@ideogram/contracts';

import { readWebAuthRouteConfiguration } from '@/lib/supabase/auth-route-config';
import { createEmailOtpRoute } from '@/server/auth/email-otp-route';

const readFormString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value : '';

const readSafeReturnPath = (value: FormDataEntryValue | null): string => {
  try {
    return normalizeWebAuthReturnPath(readFormString(value) || '/today');
  } catch {
    return '/today';
  }
};

const createSignInRedirectPath = ({
  returnTo,
  state,
}: {
  returnTo: string;
  state: 'request_failed' | 'sent';
}): string => {
  const query = new URLSearchParams({ returnTo });
  if (state === 'sent') {
    query.set('sent', '1');
  } else {
    query.set('reason', state);
  }

  return `/sign-in?${query.toString()}`;
};

export async function requestEmailOtpFormAction(formData: FormData): Promise<never> {
  const returnTo = readSafeReturnPath(formData.get('returnTo'));
  let state: 'request_failed' | 'sent' = 'request_failed';

  try {
    const configuration = readWebAuthRouteConfiguration();
    const incomingHeaders = await headers();
    const origin = incomingHeaders.get('origin') ?? 'null';
    const fetchSite = incomingHeaders.get('sec-fetch-site');
    const requestHeaders = new Headers({
      'content-type': 'application/json',
      origin,
    });

    if (fetchSite) {
      requestHeaders.set('sec-fetch-site', fetchSite);
    }

    const response = await createEmailOtpRoute()(
      new Request(new URL('/api/v1/auth/email-otp', configuration.trustedOrigin), {
        body: JSON.stringify({
          email: readFormString(formData.get('email')),
          returnTo,
        }),
        headers: requestHeaders,
        method: 'POST',
      }),
    );

    if (response.ok) {
      state = 'sent';
    }
  } catch {
    // The redirect below exposes one recoverable state and never includes the email address.
  }

  redirect(createSignInRedirectPath({ returnTo, state }));
}
