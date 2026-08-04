export interface AccountDataFailure<Account> {
  account: Account;
  error: unknown;
}

export interface AccountDataResult<Account, Data> {
  loaded: Array<{ account: Account; data: Data }>;
  failures: Array<AccountDataFailure<Account>>;
}

/**
 * Load independent private-account reads concurrently. One unavailable exchange
 * account must not hold every other account behind its request timeout.
 */
export async function loadAccountData<Account, Data>(
  accounts: Account[],
  load: (account: Account) => Promise<Data>,
): Promise<AccountDataResult<Account, Data>> {
  const results = await Promise.allSettled(
    accounts.map(async (account) => ({ account, data: await load(account) })),
  );

  const loaded: Array<{ account: Account; data: Data }> = [];
  const failures: Array<AccountDataFailure<Account>> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      loaded.push(result.value);
    } else {
      failures.push({ account: accounts[index], error: result.reason });
    }
  });

  return { loaded, failures };
}

export function getAccountDataError(
  resource: string,
  failures: Array<AccountDataFailure<unknown>>,
): string | null {
  if (failures.length === 0) return null;

  const firstError = failures[0].error;
  const message = firstError instanceof Error ? firstError.message : String(firstError);
  const prefix = failures.length === 1
    ? `Failed to load ${resource}`
    : `Failed to load ${resource} from ${failures.length} accounts`;

  return `${prefix}: ${message}`;
}
