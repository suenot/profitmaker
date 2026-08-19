import type { PlaceOrderRequest } from '../types/orders';
import { cancelOrder, executeOrder } from './orderExecutionService';

const DEFAULT_RECONCILE_ATTEMPTS = 12;
const DEFAULT_POLL_INTERVAL_MS = 250;
const REQUIRED_STABLE_SNAPSHOTS = 3;

type CancelResult = { success: boolean; error?: string };
type SubmitResult = { success: boolean; error?: string };

interface ReconciledPosition {
  side: 'long' | 'short';
  contracts: number;
}

interface EmergencyFlattenDependencies {
  cancel: (
    orderId: string,
    symbol: string,
    exchange: string,
    accountId: string,
    market: string,
  ) => Promise<CancelResult>;
  submit: (request: PlaceOrderRequest) => Promise<SubmitResult>;
  sleep: (milliseconds: number) => Promise<void>;
}

export interface EmergencyFlattenRequest {
  exchange: string;
  accountId: string;
  market: string;
  symbol: string;
  openOrders: Array<{ id?: unknown }>;
  fetchOpenOrders: () => Promise<unknown[]>;
  fetchPositions: () => Promise<unknown[]>;
  maxReconcileAttempts?: number;
  pollIntervalMs?: number;
  dependencies?: Partial<EmergencyFlattenDependencies>;
}

export interface EmergencyFlattenResult {
  success: boolean;
  cancelRequests: number;
  flattenedContracts: number;
  error?: string;
}

const defaultDependencies: EmergencyFlattenDependencies = {
  cancel: cancelOrder,
  submit: executeOrder,
  sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

function positionFrom(rows: unknown[], symbol: string): ReconciledPosition | null {
  const matches = rows
    .filter((row): row is Record<string, unknown> => (
      typeof row === 'object'
      && row !== null
      && (row as Record<string, unknown>).symbol === symbol
    ))
    .filter((row) => {
      if (row.contracts === undefined || row.contracts === null) {
        throw new Error('The exchange returned a position without a contracts value.');
      }
      const contracts = Number(row.contracts);
      if (!Number.isFinite(contracts)) {
        throw new Error('The exchange returned a position with an invalid contracts value.');
      }
      return contracts !== 0;
    });

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error('Multiple open position rows were returned; hedge-mode flattening is not supported safely.');
  }

  const row = matches[0];
  const signedContracts = Number(row.contracts);
  const side = row.side === 'short' || signedContracts < 0
    ? 'short'
    : row.side === 'long' || signedContracts > 0
      ? 'long'
      : null;

  if (!side) throw new Error('The exchange returned an open position without a usable side.');
  return { side, contracts: Math.abs(signedContracts) };
}

function positionKey(position: ReconciledPosition | null): string {
  return position ? `${position.side}:${position.contracts}` : 'flat';
}

async function reconcile(
  request: EmergencyFlattenRequest,
  dependencies: EmergencyFlattenDependencies,
  requireFlat: boolean,
): Promise<ReconciledPosition | null> {
  const attempts = Math.max(1, request.maxReconcileAttempts ?? DEFAULT_RECONCILE_ATTEMPTS);
  const pollIntervalMs = Math.max(0, request.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
  let stableSnapshots = 0;
  let previousKey: string | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const [orders, positions] = await Promise.all([
        request.fetchOpenOrders(),
        request.fetchPositions(),
      ]);
      if (!Array.isArray(orders) || !Array.isArray(positions)) {
        throw new Error('The exchange returned an invalid reconciliation snapshot.');
      }

      const position = positionFrom(positions, request.symbol);
      const key = positionKey(position);
      const acceptable = orders.length === 0 && (!requireFlat || position === null);

      if (acceptable) {
        stableSnapshots = key === previousKey ? stableSnapshots + 1 : 1;
        previousKey = key;
        if (stableSnapshots >= REQUIRED_STABLE_SNAPSHOTS) return position;
      } else {
        stableSnapshots = 0;
        previousKey = null;
      }
      lastError = undefined;
    } catch (error) {
      stableSnapshots = 0;
      previousKey = null;
      lastError = error;
    }

    if (attempt + 1 < attempts) await dependencies.sleep(pollIntervalMs);
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(
    requireFlat
      ? 'Timed out while verifying that the position is flat.'
      : 'Timed out while reconciling open orders and position. No flatten order was placed.',
  );
}

/**
 * Emergency action for the scalper widgets. Cancel acknowledgements are treated
 * as requests, not final order state: the close size is taken only from repeated
 * REST snapshots after every working order has disappeared.
 */
export async function cancelAndFlatten(
  request: EmergencyFlattenRequest,
): Promise<EmergencyFlattenResult> {
  const dependencies = { ...defaultDependencies, ...request.dependencies };
  const orderIds = Array.from(new Set(
    request.openOrders
      .map((order) => order?.id)
      .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
      .map(String),
  ));

  // A cancel rejection can mean the order filled before the request arrived.
  // Reconciliation, not the acknowledgement, decides whether it is safe to
  // flatten, so every cancel attempt is allowed to settle independently.
  await Promise.allSettled(
    orderIds.map((orderId) => dependencies.cancel(
      orderId,
      request.symbol,
      request.exchange,
      request.accountId,
      request.market,
    )),
  );

  if (request.market === 'spot') {
    return {
      success: false,
      cancelRequests: orderIds.length,
      flattenedContracts: 0,
      error: 'Spot inventory cannot be verified through the positions API. No flatten order was placed.',
    };
  }

  let position: ReconciledPosition | null;
  try {
    position = await reconcile(request, dependencies, false);
  } catch (error) {
    return {
      success: false,
      cancelRequests: orderIds.length,
      flattenedContracts: 0,
      error: error instanceof Error ? error.message : 'Could not reconcile order and position state.',
    };
  }

  if (!position) {
    return { success: true, cancelRequests: orderIds.length, flattenedContracts: 0 };
  }

  const submitResult = await dependencies.submit({
    exchange: request.exchange,
    accountId: request.accountId,
    market: request.market,
    symbol: request.symbol,
    side: position.side === 'short' ? 'buy' : 'sell',
    type: 'market',
    amount: position.contracts,
    reduceOnly: true,
  });

  if (!submitResult.success) {
    return {
      success: false,
      cancelRequests: orderIds.length,
      flattenedContracts: 0,
      error: submitResult.error || 'The flatten order was rejected.',
    };
  }

  try {
    await reconcile(request, dependencies, true);
  } catch (error) {
    return {
      success: false,
      cancelRequests: orderIds.length,
      flattenedContracts: position.contracts,
      error: error instanceof Error
        ? `Flatten order submitted, but final state is unknown: ${error.message}`
        : 'Flatten order submitted, but final state is unknown.',
    };
  }

  return {
    success: true,
    cancelRequests: orderIds.length,
    flattenedContracts: position.contracts,
  };
}
