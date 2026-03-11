import type {
  TransactionCall,
  GasEstimate,
  GasComparison,
  RpcConfig,
} from "./types.js";
import { ethEstimateGas, ethGasPrice } from "./rpc.js";

/** Format wei to MON string with 8 decimal places */
export function weiToMon(wei: bigint): string {
  const mon = Number(wei) / 1e18;
  if (mon === 0) return "0.00000000";
  if (mon < 0.00000001) return "<0.00000001";
  return mon.toFixed(8);
}

/** Format wei to ETH string with 8 decimal places */
export function weiToEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0.00000000";
  if (eth < 0.00000001) return "<0.00000001";
  return eth.toFixed(8);
}

/** Format token amount to USD string */
export function toUsd(amountStr: string, price: number): string {
  const amount = parseFloat(amountStr);
  if (amount === 0) return "$0.00";
  const usd = amount * price;
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

/** Format gwei */
export function weiToGwei(wei: bigint): string {
  const gwei = Number(wei) / 1e9;
  if (gwei < 0.001) return "<0.001";
  return gwei.toFixed(3);
}

/** Estimate gas for a transaction on Monad */
export async function estimateGas(
  tx: TransactionCall,
  config: RpcConfig
): Promise<GasEstimate> {
  const [gasHex, priceHex] = await Promise.all([
    ethEstimateGas(config.monadRpc, tx),
    ethGasPrice(config.monadRpc),
  ]);

  const estimatedGasUsed = BigInt(gasHex);
  const gasPrice = BigInt(priceHex);

  // On Monad, you pay for gas_limit, not gas_used.
  // eth_estimateGas returns the estimated gas consumption.
  // The actual gas_limit set on the tx determines what you pay.
  // We apply the multiplier to simulate realistic gas_limit setting.
  const multiplier = config.gasLimitMultiplier ?? 1.2;
  const gasLimit = BigInt(Math.ceil(Number(estimatedGasUsed) * multiplier));

  const totalFee = gasLimit * gasPrice;
  const usedFee = estimatedGasUsed * gasPrice;
  const wastedGas = gasLimit - estimatedGasUsed;
  const wastePercent = estimatedGasUsed > 0n
    ? `${((Number(wastedGas) / Number(gasLimit)) * 100).toFixed(1)}%`
    : "0.0%";

  const estimatedCostMon = weiToMon(totalFee);
  const estimatedCostUsd = config.monPriceUsd
    ? toUsd(estimatedCostMon, config.monPriceUsd)
    : null;

  return {
    gasLimit,
    estimatedGasUsed,
    gasPrice,
    totalFee,
    usedFee,
    wastedGas,
    wastePercent,
    estimatedCostMon,
    estimatedCostUsd,
  };
}

/** Compare gas costs between Monad and Ethereum */
export async function compareGas(
  tx: TransactionCall,
  config: RpcConfig
): Promise<GasComparison> {
  const monadEstimate = await estimateGas(tx, config);

  let ethereum: GasComparison["ethereum"] = null;
  let savings: GasComparison["savings"] = null;

  if (config.ethereumRpc) {
    try {
      const [ethGasHex, ethPriceHex] = await Promise.all([
        ethEstimateGas(config.ethereumRpc, tx),
        ethGasPrice(config.ethereumRpc),
      ]);

      const gasEstimate = BigInt(ethGasHex);
      const gasPrice = BigInt(ethPriceHex);
      const totalCostWei = gasEstimate * gasPrice;
      const estimatedCostEth = weiToEth(totalCostWei);
      const estimatedCostUsd = config.ethPriceUsd
        ? toUsd(estimatedCostEth, config.ethPriceUsd)
        : null;

      ethereum = { gasEstimate, gasPrice, estimatedCostEth, estimatedCostUsd };

      // Compare USD costs if both prices available, otherwise compare raw wei
      if (config.monPriceUsd && config.ethPriceUsd) {
        const monadUsd = parseFloat(monadEstimate.estimatedCostMon) * config.monPriceUsd;
        const ethUsd = parseFloat(estimatedCostEth) * config.ethPriceUsd;
        if (ethUsd > 0) {
          const saved = ethUsd - monadUsd;
          const pct = (saved / ethUsd) * 100;
          savings = {
            percentage: `${pct.toFixed(1)}%`,
            absoluteMon: weiToMon(monadEstimate.totalFee),
          };
        }
      } else {
        // Fallback: compare raw gas costs (not perfectly accurate across chains)
        const ethCost = gasEstimate * gasPrice;
        if (ethCost > 0n) {
          const saved = ethCost - monadEstimate.totalFee;
          const pct = (Number(saved) / Number(ethCost)) * 100;
          savings = {
            percentage: `${pct.toFixed(1)}%`,
            absoluteMon: weiToMon(saved > 0n ? saved : -saved),
          };
        }
      }
    } catch {
      // Ethereum estimation failed
    }
  }

  return { monad: monadEstimate, ethereum, savings };
}
