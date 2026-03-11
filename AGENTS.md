# monad-gas — Agent Instructions

## What this project does

CLI tool and library for estimating gas costs on Monad blockchain. Monad charges gas based on gas_limit (not gas_used) with no refunds, making accurate estimation critical.

## Build / Test / Lint

```bash
npm run build    # tsup → dist/
npm test         # vitest
npm run lint     # tsc --noEmit
```

## Source layout

- `src/estimator.ts` — estimateGas(), compareGas(), conversion helpers
- `src/rpc.ts` — JSON-RPC 2.0 calls (eth_estimateGas, eth_gasPrice)
- `src/presets.ts` — 6 preset transaction types
- `src/reporter.ts` — formatEstimate(), formatComparison(), formatJson()
- `src/cli.ts` — Commander CLI entry point
- `src/types.ts` — All TypeScript interfaces

## Important context

- Monad RPC: https://rpc.monad.xyz (Chain ID 143)
- Currency is MON, not ETH
- gasLimitMultiplier defaults to 1.2 (20% buffer above estimated usage)
- No L1 data fees (Monad is L1, not L2)
- Tests use vitest with mocked fetch for RPC calls
