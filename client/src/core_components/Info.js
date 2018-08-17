import React from 'react'

export default ({ wallet, balanceWEI, balanceETH, dexAddress, tokenAddress, tokenDecimals, tokenBalanceWEI,
    tokenBalanceTKN, tokenName, tokenSymbol, depositWEI, depositETH, approvedWEI, approvedTKN }) => (
    <div>
      <p>wallet: {wallet}</p>
      <p>balanceWEI: {balanceWEI} WEI</p>
      <p>balanceETH: {balanceETH} ETH</p>
      <p>dexAddress: {dexAddress}</p>
      <p>tokenAddress: {tokenAddress}</p>
      <p>tokenDecimals: {tokenDecimals}</p>
      <p>tokenBalanceWEI: {tokenBalanceWEI}</p>
      <p>tokenBalanceTKN: {tokenBalanceTKN}</p>
      <p>tokenName: {tokenName}</p>
      <p>tokenSymbol: {tokenSymbol}</p>
      <p>depositWEI: {depositWEI}</p>
      <p>depositETH: {depositETH}</p>
      <p>approvedWEI: {approvedWEI}</p>
      <p>approvedTKN: {approvedTKN}</p>
    </div>
)
