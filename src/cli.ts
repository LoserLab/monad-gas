import { Command } from "commander";
import { compareGas } from "./estimator.js";
import { buildPresetTx, allPresets, presetDescriptions } from "./presets.js";
import { formatPresetTable, formatComparison, formatJson } from "./reporter.js";
import type { GasComparison, PresetType, RpcConfig } from "./types.js";

const MONAD_MAINNET_RPC = "https://rpc.monad.xyz";
const ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";

const program = new Command();

program
  .name("monad-gas")
  .description(
    "Gas estimator for Monad. WARNING: Monad charges on gas_limit, not gas_used. Accurate estimation saves real money."
  )
  .version("0.1.0");

program
  .option("--rpc <url>", "Monad RPC endpoint", MONAD_MAINNET_RPC)
  .option("--eth-rpc <url>", "Ethereum RPC for comparison", ETHEREUM_RPC)
  .option("--no-compare", "Skip Ethereum comparison")
  .option("--json", "Output as JSON")
  .option("--mon-price <usd>", "MON price in USD for cost estimation")
  .option("--eth-price <usd>", "ETH price in USD for cost estimation")
  .option("--multiplier <n>", "Gas limit multiplier (default: 1.2, lower = cheaper but riskier)", "1.2")
  .option(
    "-p, --preset <type>",
    "Estimate a specific preset: transfer, erc20-transfer, erc20-approve, swap, nft-mint, deploy"
  )
  .option("--to <address>", "Target contract address for custom estimation")
  .option("--data <hex>", "Calldata for custom estimation")
  .option("--from <address>", "Sender address for custom estimation")
  .option("--value <hex>", "Value in wei (hex) for custom estimation")
  .action(async (opts) => {
    try {
      const config: RpcConfig = {
        monadRpc: opts.rpc,
        ethereumRpc: opts.compare === false ? undefined : opts.ethRpc,
        monPriceUsd: opts.monPrice ? parseFloat(opts.monPrice) : undefined,
        ethPriceUsd: opts.ethPrice ? parseFloat(opts.ethPrice) : undefined,
        gasLimitMultiplier: parseFloat(opts.multiplier),
      };

      // Custom transaction
      if (opts.to || opts.data) {
        if (!opts.to) {
          console.error("Error: --to is required for custom estimation");
          process.exit(1);
        }
        const tx = {
          from: opts.from || "0x0000000000000000000000000000000000000000",
          to: opts.to,
          data: opts.data,
          value: opts.value,
        };
        const comparison = await compareGas(tx, config);
        if (opts.json) {
          console.log(JSON.stringify({
            type: "custom",
            monad: {
              gasLimit: comparison.monad.gasLimit.toString(),
              estimatedGasUsed: comparison.monad.estimatedGasUsed.toString(),
              wastedGas: comparison.monad.wastedGas.toString(),
              wastePercent: comparison.monad.wastePercent,
              gasPrice: comparison.monad.gasPrice.toString(),
              totalFee: comparison.monad.totalFee.toString(),
              usedFee: comparison.monad.usedFee.toString(),
              estimatedCostMon: comparison.monad.estimatedCostMon,
              estimatedCostUsd: comparison.monad.estimatedCostUsd,
            },
            ethereum: comparison.ethereum ? {
              gasEstimate: comparison.ethereum.gasEstimate.toString(),
              gasPrice: comparison.ethereum.gasPrice.toString(),
              estimatedCostEth: comparison.ethereum.estimatedCostEth,
              estimatedCostUsd: comparison.ethereum.estimatedCostUsd,
            } : null,
            savings: comparison.savings,
          }, null, 2));
        } else {
          console.log(formatComparison(comparison, "Custom Transaction"));
        }
        return;
      }

      // Single preset
      if (opts.preset) {
        if (!allPresets.includes(opts.preset as PresetType)) {
          console.error(
            `Error: Unknown preset "${opts.preset}". Available: ${allPresets.join(", ")}`
          );
          process.exit(1);
        }
        const preset = opts.preset as PresetType;
        const tx = buildPresetTx(preset);
        const comparison = await compareGas(tx, config);
        if (opts.json) {
          console.log(formatJson([{ preset, comparison }]));
        } else {
          console.log(
            formatComparison(comparison, presetDescriptions[preset])
          );
        }
        return;
      }

      // All presets
      const results: Array<{ preset: PresetType; comparison: GasComparison }> = [];

      for (const preset of allPresets) {
        const tx = buildPresetTx(preset);
        try {
          const comparison = await compareGas(tx, config);
          results.push({ preset, comparison });
        } catch {
          // Skip presets that fail
        }
      }

      if (opts.json) {
        console.log(formatJson(results));
      } else {
        console.log(formatPresetTable(results));
      }
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  });

program.parse();
