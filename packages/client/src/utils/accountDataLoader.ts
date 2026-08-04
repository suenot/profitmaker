export interface AccountDataFailure<Account> {
  account: Account;
  error: unknown;
}

export interface AccountDataResult<Account, Data> {
  loaded: Array<{ account: Account; data: Data }>;
  failures: Array<AccountDataFailure<Account>>;
}

export interface AccountDataIssue {
  error: string | null;
  warning: string | null;
}

/**
 * Load independent private-account reads concurrently. One unavailable exchange
 * account must not hold every other account behind its request timeout.
 */
export async function loadAccountData<Account, Data>(
  accounts: Account[],
  load: (account: Account) => Promise<Data>,
  onProgress?: (result: AccountDataResult<Account, Data>) => void,
): Promise<AccountDataResult<Account, Data>> {
  const results: Array<PromiseSettledResult<{ account: Account; data: Data }> | undefined> =
    new Array(accounts.length);

  const collectResult = (): AccountDataResult<Account, Data> => {
    const loaded: Array<{ account: Account; data: Data }> = [];
    const failures: Array<AccountDataFailure<Account>> = [];

    results.forEach((result, index) => {
      if (!result) return;
      if (result.status === 'fulfilled') {
        loaded.push(result.value);
      } else {
        failures.push({ account: accounts[index], error: result.reason });
      }
    });

    return { loaded, failures };
  };

  await Promise.all(accounts.map(async (account, index) => {
    try {
      results[index] = {
        status: 'fulfilled',
        value: { account, data: await load(account) },
      };
    } catch (error) {
      results[index] = { status: 'rejected', reason: error };
    }

    onProgress?.(collectResult());
  }));

  return collectResult();
}

export function getAccountDataError<Account>(
  resource: string,
  failures: Array<AccountDataFailure<Account>>,
  getAccountLabel?: (account: Account) => string,
): string | null {
  if (failures.length === 0) return null;

  const firstError = failures[0].error;
  const message = firstError instanceof Error ? firstError.message : String(firstError);
  const labels = getAccountLabel
    ? failures.map(({ account }) => getAccountLabel(account)).filter(Boolean)
    : [];
  const prefix = labels.length > 0
    ? failures.length === 1
      ? `Failed to load ${resource} for ${labels[0]}`
      : `Failed to load ${resource} for ${failures.length} accounts (${labels.join(', ')})`
    : failures.length === 1
      ? `Failed to load ${resource}`
      : `Failed to load ${resource} from ${failures.length} accounts`;

  return `${prefix}: ${message}`;
}

export function getAccountDataIssue<Account, Data>(
  resource: string,
  result: AccountDataResult<Account, Data>,
  getAccountLabel?: (account: Account) => string,
): AccountDataIssue {
  const message = getAccountDataError(resource, result.failures, getAccountLabel);
  if (!message) return { error: null, warning: null };

  return result.loaded.length > 0
    ? { error: null, warning: message }
    : { error: message, warning: null };
}
