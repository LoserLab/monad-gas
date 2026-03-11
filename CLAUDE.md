# monad-gas

Gas estimator CLI for Monad blockchain.

## Commands

- `npm run build` — Build with tsup (CJS + ESM + types)
- `npm test` — Run vitest tests
- `npm run lint` — Type check with tsc

## Architecture

- `src/estimator.ts` — Core logic: gas estimation with waste tracking
- `src/rpc.ts` — JSON-RPC client (eth_estimateGas, eth_gasPrice)
- `src/presets.ts` — 6 preset transaction builders
- `src/reporter.ts` — ANSI terminal + JSON output
- `src/cli.ts` — Commander CLI
- `src/types.ts` — TypeScript interfaces

## Key concept

Monad charges gas on gas_limit, not gas_used. No refunds. The gasLimitMultiplier (default 1.2) controls how much buffer above eth_estimateGas is added. This directly affects cost.

## Conventions

- Pure TypeScript, no runtime deps except commander
- Tests mock fetch for RPC calls
- Bigints for all wei values, converted to strings for JSON serialization
- Currency is MON (not ETH) for Monad estimates
