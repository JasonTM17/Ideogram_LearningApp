import type { AsyncKeyValueStorage } from '../secure-session/secure-session-storage-types';

export interface NativeEmailOtpTransaction {
  expiresAt: string;
  nonce: string;
  redirectUri: string;
  state: string;
}

export interface NativeEmailOtpTransactionStore {
  consumeMatching: (input: {
    nonce: string;
    redirectUri: string;
    state: string;
  }) => Promise<NativeEmailOtpTransaction | null>;
  replace: (transaction: NativeEmailOtpTransaction) => Promise<void>;
}

const entropyPattern = /^[a-f0-9]{64}$/;
const sharedTransactionLocks = new Map<string, Promise<void>>();

const isStoredTransaction = (value: unknown): value is NativeEmailOtpTransaction => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.expiresAt === 'string' &&
    Number.isFinite(Date.parse(candidate.expiresAt)) &&
    typeof candidate.nonce === 'string' &&
    entropyPattern.test(candidate.nonce) &&
    typeof candidate.redirectUri === 'string' &&
    candidate.redirectUri.length > 0 &&
    candidate.redirectUri.length <= 2_048 &&
    typeof candidate.state === 'string' &&
    entropyPattern.test(candidate.state)
  );
};

const parseTransaction = (value: string | null): NativeEmailOtpTransaction | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return isStoredTransaction(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export class SecureNativeEmailOtpTransactionStore implements NativeEmailOtpTransactionStore {
  constructor(
    private readonly storage: AsyncKeyValueStorage,
    private readonly transactionKey: string,
  ) {}

  async consumeMatching(input: {
    nonce: string;
    redirectUri: string;
    state: string;
  }): Promise<NativeEmailOtpTransaction | null> {
    return this.runExclusive(async () => {
      const rawTransaction = await this.storage.getItem(this.transactionKey);
      const transaction = parseTransaction(rawTransaction);
      if (!transaction) {
        if (rawTransaction) {
          await this.storage.removeItem(this.transactionKey);
        }
        return null;
      }

      if (
        transaction.nonce !== input.nonce ||
        transaction.redirectUri !== input.redirectUri ||
        transaction.state !== input.state
      ) {
        return null;
      }

      await this.storage.removeItem(this.transactionKey);
      return transaction;
    });
  }

  async replace(transaction: NativeEmailOtpTransaction): Promise<void> {
    if (!isStoredTransaction(transaction)) {
      throw new TypeError('Native email OTP transaction is invalid.');
    }

    await this.runExclusive(() =>
      this.storage.setItem(this.transactionKey, JSON.stringify(transaction)),
    );
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = sharedTransactionLocks.get(this.transactionKey) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    sharedTransactionLocks.set(this.transactionKey, tail);

    return result.finally(() => {
      if (sharedTransactionLocks.get(this.transactionKey) === tail) {
        sharedTransactionLocks.delete(this.transactionKey);
      }
    });
  }
}
