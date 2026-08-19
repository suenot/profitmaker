import type { PrivateTradingDataType } from '@profitmaker/types';

type Row = Record<string, unknown> & { info?: Record<string, unknown> };

interface VersionedRow {
  row: Row;
  version: number;
  source: 'rest' | 'stream';
  exchangeVersion?: number;
}

interface VersionedOrder extends VersionedRow {
  /** Whether the latest stream/REST evidence says the order is still working. */
  visible: boolean;
}

const TERMINAL_ORDER_STATUSES = new Set([
  'closed',
  'canceled',
  'cancelled',
  'expired',
  'rejected',
  'filled',
]);

const asRows = (data: unknown): Row[] => (
  Array.isArray(data)
    ? data.filter((row): row is Row => typeof row === 'object' && row !== null)
    : []
);

const finiteTimestamp = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return undefined;
};

const exchangeTimestamp = (row: Row): number | undefined => finiteTimestamp(
  row.lastTradeTimestamp,
  row.timestamp,
  row.updateTime,
  row.info?.updateTime,
  row.info?.uTime,
  row.info?.updatedTime,
);

const rowTimestamp = (row: Row, receivedAt: number): number => exchangeTimestamp(row) ?? receivedAt;

const finiteAmount = (value: unknown): number => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const orderKey = (row: Row): string | null => {
  const id = row.id ?? row.orderId ?? row.clientOrderId ?? row.clientOid;
  return id === undefined || id === null || id === '' ? null : String(id);
};

const tradeKey = (row: Row): string | null => {
  const id = row.id ?? row.tradeId;
  if (id !== undefined && id !== null && id !== '') return String(id);
  const composite = [row.order ?? row.orderId, row.timestamp, row.side, row.price, row.amount]
    .map((value) => value ?? '')
    .join(':');
  return composite === '::::' ? null : composite;
};

const positionKey = (row: Row): string | null => {
  if (typeof row.symbol !== 'string' || !row.symbol) return null;
  return `${row.symbol}:${row.positionSide ?? row.side ?? row.hedgedSide ?? 'net'}:${row.marginMode ?? 'default'}`;
};

const isTerminalOrder = (row: Row): boolean => (
  TERMINAL_ORDER_STATUSES.has(String(row.status ?? '').toLowerCase())
);

const positionContracts = (row: Row): number => {
  const contracts = Number(row.contracts ?? 0);
  return Number.isFinite(contracts) ? contracts : 0;
};

/**
 * Account/instrument private-state reducer. REST snapshots provide a generation
 * boundary; websocket rows then merge monotonically on top. Terminal order
 * states never reopen, and trade ids are idempotent across CCXT Pro newUpdates
 * batches and overlapping REST backfills.
 */
export class PrivateTradingLedger {
  private readonly orders = new Map<string, VersionedOrder>();
  private readonly orderAliases = new Map<string, string>();
  private readonly trades = new Map<string, VersionedRow>();
  private readonly positions = new Map<string, VersionedRow>();
  private revisionValue = 0;

  get revision(): number {
    return this.revisionValue;
  }

  get latestTradeTimestamp(): number | undefined {
    let latest: number | undefined;
    for (const { row, version } of this.trades.values()) {
      const timestamp = finiteTimestamp(row.timestamp, version);
      if (timestamp !== undefined && (latest === undefined || timestamp > latest)) latest = timestamp;
    }
    return latest;
  }

  applyEvent(
    dataType: PrivateTradingDataType,
    data: unknown,
    receivedAt: number,
    afterSnapshot = false,
  ): void {
    const rows = asRows(data);
    if (dataType === 'orders') this.mergeOrders(rows, receivedAt, false, afterSnapshot);
    else if (dataType === 'myTrades') this.mergeTrades(rows, receivedAt, false);
    else this.mergePositions(rows, receivedAt, false, afterSnapshot);
  }

  applyBackfill(args: {
    symbol: string;
    /** Undefined means that REST channel failed and must not clear good state. */
    openOrders?: unknown;
    positions?: unknown;
    myTrades?: unknown;
    snapshotAt: number;
  }): void {
    if (args.openOrders !== undefined) {
      const orders = asRows(args.openOrders);
      const presentOrderKeys = new Set<string>();
      for (const row of orders) {
        const key = this.resolveOrderKey(row);
        if (key) presentOrderKeys.add(key);
      }
      for (const [key, current] of this.orders) {
        if (
          current.row.symbol === args.symbol
          && current.visible
          && !presentOrderKeys.has(key)
          && current.version <= args.snapshotAt
        ) {
          // fetchOpenOrders proves only that an order is no longer working. It
          // does not prove whether it filled or was cancelled, so keep the last
          // exchange status and hide it until an order/trade event resolves it.
          this.orders.set(key, {
            ...current,
            visible: false,
            version: args.snapshotAt,
            source: 'rest',
          });
          this.revisionValue += 1;
        }
      }
      this.mergeOrders(orders, args.snapshotAt, true);
    }

    if (args.positions !== undefined) {
      const positions = asRows(args.positions);
      const presentPositionKeys = new Set<string>();
      for (const row of positions) {
        const key = positionKey(row);
        if (key) presentPositionKeys.add(key);
      }
      for (const [key, current] of this.positions) {
        if (
          current.row.symbol === args.symbol
          && !presentPositionKeys.has(key)
          && current.version <= args.snapshotAt
        ) {
          this.positions.set(key, {
            row: { ...current.row, contracts: 0 },
            version: args.snapshotAt,
            source: 'rest',
          });
          this.revisionValue += 1;
        }
      }
      this.mergePositions(positions, args.snapshotAt, true);
    }
    if (args.myTrades !== undefined) this.mergeTrades(asRows(args.myTrades), args.snapshotAt, true);
  }

  snapshot(symbol: string): { openOrders: Row[]; positions: Row[]; myTrades: Row[]; revision: number } {
    const openOrders = Array.from(this.orders.values())
      .filter(({ row, visible }) => visible && row.symbol === symbol && !isTerminalOrder(row))
      .map(({ row }) => row);
    const positions = Array.from(this.positions.values())
      .map(({ row }) => row)
      .filter((row) => row.symbol === symbol && positionContracts(row) !== 0);
    const myTrades = Array.from(this.trades.values())
      .map(({ row }) => row)
      .filter((row) => row.symbol === undefined || row.symbol === symbol)
      .sort((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0));
    return { openOrders, positions, myTrades, revision: this.revisionValue };
  }

  private mergeOrders(rows: Row[], receivedAt: number, snapshot: boolean, afterSnapshot = false): void {
    for (const row of rows) {
      const key = this.resolveOrderKey(row);
      if (!key) continue;
      const version = receivedAt;
      const nextExchangeVersion = exchangeTimestamp(row);
      const current = this.orders.get(key);
      const replacesRestSnapshot = Boolean(current && afterSnapshot && current.source === 'rest');
      if (current && !replacesRestSnapshot && version < current.version) continue;
      if (
        current
        && !snapshot
        && !replacesRestSnapshot
        && current.exchangeVersion !== undefined
        && nextExchangeVersion !== undefined
        && nextExchangeVersion < current.exchangeVersion
      ) continue;
      if (current && isTerminalOrder(current.row) && !isTerminalOrder(row)) continue;
      const merged = current
        ? {
            ...current.row,
            ...row,
            filled: Math.max(finiteAmount(current.row.filled), finiteAmount(row.filled)),
          }
        : row;
      this.orders.set(key, {
        row: merged,
        version: replacesRestSnapshot ? version : Math.max(version, current?.version ?? 0),
        source: snapshot ? 'rest' : 'stream',
        exchangeVersion: Math.max(nextExchangeVersion ?? 0, current?.exchangeVersion ?? 0) || undefined,
        visible: !isTerminalOrder(merged),
      });
      this.revisionValue += 1;
    }
  }

  private resolveOrderKey(row: Row): string | null {
    const exchangeId = row.id ?? row.orderId;
    const clientId = row.clientOrderId ?? row.clientOid ?? row.info?.clientOrderId ?? row.info?.clientOid;
    const aliases = [
      exchangeId !== undefined && exchangeId !== null && exchangeId !== '' ? `id:${String(exchangeId)}` : null,
      clientId !== undefined && clientId !== null && clientId !== '' ? `client:${String(clientId)}` : null,
    ].filter((value): value is string => value !== null);
    if (!aliases.length) {
      const legacy = orderKey(row);
      return legacy ? `legacy:${legacy}` : null;
    }

    const mappedKeys = Array.from(new Set(
      aliases.map((alias) => this.orderAliases.get(alias)).filter((value): value is string => Boolean(value)),
    ));
    const key = mappedKeys[0] ?? aliases[0];
    for (const duplicateKey of mappedKeys.slice(1)) this.mergeOrderAlias(key, duplicateKey);
    for (const alias of aliases) this.orderAliases.set(alias, key);
    return key;
  }

  private mergeOrderAlias(targetKey: string, duplicateKey: string): void {
    if (targetKey === duplicateKey) return;
    const target = this.orders.get(targetKey);
    const duplicate = this.orders.get(duplicateKey);
    if (duplicate) {
      if (!target) {
        this.orders.set(targetKey, duplicate);
      } else {
        const newer = duplicate.version > target.version ? duplicate : target;
        const older = newer === target ? duplicate : target;
        const terminal = isTerminalOrder(newer.row)
          ? newer.row
          : isTerminalOrder(older.row) ? older.row : undefined;
        const mergedRow = {
          ...older.row,
          ...newer.row,
          ...(terminal ? { status: terminal.status } : {}),
          filled: Math.max(finiteAmount(older.row.filled), finiteAmount(newer.row.filled)),
        };
        this.orders.set(targetKey, {
          row: mergedRow,
          version: Math.max(target.version, duplicate.version),
          source: newer.source,
          exchangeVersion: Math.max(target.exchangeVersion ?? 0, duplicate.exchangeVersion ?? 0) || undefined,
          visible: !isTerminalOrder(mergedRow) && (target.visible || duplicate.visible),
        });
      }
      this.orders.delete(duplicateKey);
    }
    for (const [alias, mappedKey] of this.orderAliases) {
      if (mappedKey === duplicateKey) this.orderAliases.set(alias, targetKey);
    }
  }

  private mergeTrades(rows: Row[], receivedAt: number, snapshot: boolean): void {
    for (const row of rows) {
      const key = tradeKey(row);
      if (!key) continue;
      const version = snapshot ? Math.max(rowTimestamp(row, receivedAt), receivedAt) : rowTimestamp(row, receivedAt);
      const current = this.trades.get(key);
      if (current && version <= current.version) continue;
      this.trades.set(key, {
        row: current ? { ...current.row, ...row } : row,
        version,
        source: snapshot ? 'rest' : 'stream',
        exchangeVersion: exchangeTimestamp(row),
      });
      this.revisionValue += 1;
    }
  }

  private mergePositions(rows: Row[], receivedAt: number, snapshot: boolean, afterSnapshot = false): void {
    for (const row of rows) {
      const key = positionKey(row);
      if (!key) continue;
      const version = receivedAt;
      const nextExchangeVersion = exchangeTimestamp(row);
      const current = this.positions.get(key);
      const replacesRestSnapshot = Boolean(current && afterSnapshot && current.source === 'rest');
      if (current && !replacesRestSnapshot && version < current.version) continue;
      if (
        current
        && !snapshot
        && !replacesRestSnapshot
        && current.exchangeVersion !== undefined
        && nextExchangeVersion !== undefined
        && nextExchangeVersion < current.exchangeVersion
      ) continue;
      this.positions.set(key, {
        row: current ? { ...current.row, ...row } : row,
        version: replacesRestSnapshot ? version : Math.max(version, current?.version ?? 0),
        source: snapshot ? 'rest' : 'stream',
        exchangeVersion: Math.max(nextExchangeVersion ?? 0, current?.exchangeVersion ?? 0) || undefined,
      });
      this.revisionValue += 1;
    }
  }
}
