import type { GasEstimate, GasComparison, PresetType } from "./types.js";
import { weiToGwei, weiToMon, weiToEth } from "./estimator.js";
import { presetDescriptions } from "./presets.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";

function formatRow(label: string, value: string, color = WHITE): string {
  return `  ${DIM}${label.padEnd(24)}${RESET}${color}${value}${RESET}`;
}

/** Format a single Monad gas estimate */
export function formatEstimate(est: GasEstimate, label?: string): string {
  const lines: string[] = [];

  if (label) {
    lines.push(`${BOLD}${BLUE}${label}${RESET}`);
    lines.push("");
  }

  lines.push(`${BOLD}${WHITE}  Monad${RESET}`);
  lines.push(formatRow("Gas limit (you pay)", est.gasLimit.toLocaleString(), CYAN));
  lines.push(formatRow("Est. gas used", est.estimatedGasUsed.toLocaleString(), DIM));
  lines.push(formatRow("Wasted gas", `${est.wastedGas.toLocaleString()} (${est.wastePercent})`, Number(est.wastedGas) > 0 ? YELLOW : DIM));
  lines.push(formatRow("Gas price", `${weiToGwei(est.gasPrice)} gwei`, CYAN));
  lines.push("");
  lines.push(formatRow("You pay (gas_limit)", `${est.estimatedCostMon} MON`, GREEN));
  lines.push(formatRow("You'd pay (gas_used)", `${weiToMon(est.usedFee)} MON`, DIM));
  if (est.estimatedCostUsd) {
    lines.push(formatRow("", est.estimatedCostUsd, GREEN));
  }

  return lines.join("\n");
}

/** Format a full gas comparison */
export function formatComparison(cmp: GasComparison, label?: string): string {
  const lines: string[] = [];

  if (label) {
    lines.push(`${BOLD}${BLUE}${label}${RESET}`);
    lines.push("");
  }

  // Monad section
  lines.push(`${BOLD}${WHITE}  Monad${RESET}  ${DIM}(charges gas_limit, not gas_used)${RESET}`);
  lines.push(formatRow("Gas limit (you pay)", cmp.monad.gasLimit.toLocaleString(), CYAN));
  lines.push(formatRow("Est. gas used", cmp.monad.estimatedGasUsed.toLocaleString(), DIM));
  lines.push(formatRow("Wasted gas", `${cmp.monad.wastedGas.toLocaleString()} (${cmp.monad.wastePercent})`, Number(cmp.monad.wastedGas) > 0 ? YELLOW : DIM));
  lines.push(formatRow("Gas price", `${weiToGwei(cmp.monad.gasPrice)} gwei`, CYAN));
  lines.push(formatRow("You pay (gas_limit)", `${cmp.monad.estimatedCostMon} MON`, GREEN));
  if (cmp.monad.estimatedCostUsd) {
    lines.push(formatRow("", cmp.monad.estimatedCostUsd, GREEN));
  }

  // Ethereum section
  if (cmp.ethereum) {
    lines.push("");
    lines.push(`${BOLD}${WHITE}  Ethereum L1${RESET}  ${DIM}(charges gas_used + refunds unused)${RESET}`);
    lines.push(formatRow("Gas estimate", cmp.ethereum.gasEstimate.toLocaleString(), CYAN));
    lines.push(formatRow("Gas price", `${weiToGwei(cmp.ethereum.gasPrice)} gwei`, CYAN));
    lines.push(formatRow("Estimated cost", `${cmp.ethereum.estimatedCostEth} ETH`, YELLOW));
    if (cmp.ethereum.estimatedCostUsd) {
      lines.push(formatRow("", cmp.ethereum.estimatedCostUsd, YELLOW));
    }
  }

  // Savings section
  if (cmp.savings) {
    lines.push("");
    const pct = parseFloat(cmp.savings.percentage);
    if (pct > 0) {
      lines.push(`  ${BOLD}${GREEN}\u2193 ${cmp.savings.percentage} cheaper on Monad${RESET}`);
    } else {
      lines.push(`  ${BOLD}${YELLOW}\u2191 ${cmp.savings.percentage.replace("-", "")} more expensive on Monad${RESET}`);
    }
  }

  return lines.join("\n");
}

/** Format preset comparison table */
export function formatPresetTable(
  results: Array<{ preset: PresetType; comparison: GasComparison }>
): string {
  const lines: string[] = [];

  lines.push(`${BOLD}${BLUE}monad-gas${RESET} ${DIM}v0.1.0${RESET}`);
  lines.push("");
  lines.push(`  ${RED}${BOLD}WARNING:${RESET} Monad charges gas based on gas_limit, not gas_used.`);
  lines.push(`  ${DIM}Set tight gas limits to avoid overpaying. Use --multiplier to control.${RESET}`);
  lines.push("");

  for (const { preset, comparison } of results) {
    const desc = presetDescriptions[preset];
    lines.push(formatComparison(comparison, desc));
    lines.push("");
    lines.push(`${DIM}${"─".repeat(50)}${RESET}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Format results as JSON */
export function formatJson(
  results: Array<{ preset: PresetType; comparison: GasComparison }>
): string {
  const serializable = results.map(({ preset, comparison }) => ({
    preset,
    description: presetDescriptions[preset],
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
    ethereum: comparison.ethereum
      ? {
          gasEstimate: comparison.ethereum.gasEstimate.toString(),
          gasPrice: comparison.ethereum.gasPrice.toString(),
          estimatedCostEth: comparison.ethereum.estimatedCostEth,
          estimatedCostUsd: comparison.ethereum.estimatedCostUsd,
        }
      : null,
    savings: comparison.savings,
  }));

  return JSON.stringify(serializable, null, 2);
}
