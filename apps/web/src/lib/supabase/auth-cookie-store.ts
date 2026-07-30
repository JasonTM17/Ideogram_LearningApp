export interface AuthCookie {
  name: string;
  value: string;
}

export interface AuthCookieSetOptions {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | 'lax' | 'none' | 'strict';
  secure?: boolean;
}

export interface AuthCookieStore {
  get: (name: string) => AuthCookie | undefined;
  getAll: () => AuthCookie[];
  set: (name: string, value: string, options?: AuthCookieSetOptions) => void;
}
