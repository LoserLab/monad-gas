/** Transaction call object for estimation */
export interface TransactionCall {
  from?: string;
  to: string;
  data?: string;
  value?: string;
}

/** Breakdown of gas estimate for Monad */
export interface GasEstimate {
  /** Gas limit (what you PAY for on Monad) */
  gasLimit: bigint;
  /** Estimated gas that will actually be used */
  estimatedGasUsed: bigint;
  /** Gas price (wei) */
  gasPrice: bigint;
  /** Total cost = gasLimit * gasPrice (wei) */
  totalFee: bigint;
  /** Cost if you only paid for gasUsed (wei) - for comparison */
  usedFee: bigint;
  /** Wasted gas = gasLimit - estimatedGasUsed */
  wastedGas: bigint;
  /** Waste percentage */
  wastePercent: string;
  /** Total cost in MON */
  estimatedCostMon: string;
  /** Total cost in USD (if monPrice provided) */
  estimatedCostUsd: string | null;
}

/** Comparison between Monad and Ethereum gas costs */
export interface GasComparison {
  monad: GasEstimate;
  ethereum: {
    gasEstimate: bigint;
    gasPrice: bigint;
    estimatedCostEth: string;
    estimatedCostUsd: string | null;
  } | null;
  savings: {
    percentage: string;
    absoluteMon: string;
  } | null;
}

/** RPC configuration */
export interface RpcConfig {
  monadRpc: string;
  ethereumRpc?: string;
  monPriceUsd?: number;
  ethPriceUsd?: number;
  /** Gas limit multiplier (default 1.0 = use eth_estimateGas as-is).
   *  On Monad you pay for the full gas_limit, so tighter limits save money. */
  gasLimitMultiplier?: number;
}

/** Preset transaction types */
export type PresetType =
  | "transfer"
  | "erc20-transfer"
  | "erc20-approve"
  | "swap"
  | "nft-mint"
  | "deploy";
