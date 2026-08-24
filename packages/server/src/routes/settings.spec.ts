import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserFromRequest: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
}));

vi.mock('../middleware/requireUser', () => ({
  getUserFromRequest: (request: Request) => mocks.getUserFromRequest(request),
}));

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mocks.select(...args),
  },
}));

vi.mock('../services/stateEvents', () => ({
  clientIdFromRequest: () => null,
  emitStateChanged: vi.fn(),
}));

const { settingsRoutes } = await import('./settings');

async function getSetting(key: string) {
  const response = await settingsRoutes.handle(
    new Request(`http://localhost/api/settings/${encodeURIComponent(key)}`, {
      headers: { Authorization: 'Bearer test' },
    }),
  );
  return {
    status: response.status,
    body: await response.json(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserFromRequest.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: null });
  mocks.select.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ where: mocks.where });
  mocks.where.mockResolvedValue([]);
});

describe('GET /api/settings/:key', () => {
  it('returns the effective default for an optional setting with no stored row', async () => {
    const result = await getSetting('builtinWidgets.disabled');

    expect(result).toEqual({
      status: 200,
      body: {
        success: true,
        data: { key: 'builtinWidgets.disabled', value: [] },
      },
    });
  });

  it('returns the effective default for modules.disabled with no stored row', async () => {
    const result = await getSetting('modules.disabled');

    expect(result).toEqual({
      status: 200,
      body: {
        success: true,
        data: { key: 'modules.disabled', value: [] },
      },
    });
  });

  it('prefers a stored value over the optional setting default', async () => {
    mocks.where.mockResolvedValueOnce([{
      key: 'builtinWidgets.disabled',
      value: ['chart'],
    }]);

    const result = await getSetting('builtinWidgets.disabled');

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      success: true,
      data: { key: 'builtinWidgets.disabled', value: ['chart'] },
    });
  });

  it('keeps returning 404 for an unknown setting with no stored row', async () => {
    const result = await getSetting('unknown.setting');

    expect(result).toEqual({
      status: 404,
      body: { error: 'Setting not found' },
    });
  });
});
