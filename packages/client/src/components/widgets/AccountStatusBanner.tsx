import React from 'react';
import { AccountDataSummary } from '../../utils/accountDataLoader';

interface AccountStatusBannerProps {
  summary: AccountDataSummary;
  noun: string;
}

/**
 * Per-account breakdown for a partially loaded multi-account fetch. Renders
 * nothing while every account succeeded. Pure renderer — all aggregation
 * logic lives in summarizeAccountData.
 */
const AccountStatusBanner: React.FC<AccountStatusBannerProps> = ({ summary, noun }) => {
  if (summary.failedAccounts === 0) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
      <div>
        Partial data: {summary.loadedAccounts}/{summary.totalAccounts} accounts loaded
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer select-none hover:text-amber-200">
          Account details
        </summary>
        <div className="mt-1 flex flex-col gap-0.5">
          {summary.rows.map((row, index) => (
            <div
              key={`${index}-${row.label}`}
              className={row.ok ? 'text-amber-200/70' : 'text-red-400'}
            >
              {row.label} — {row.ok ? `${row.count} ${noun}` : row.error}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default AccountStatusBanner;
