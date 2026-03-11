import { describe, it, expect } from "vitest";
import { formatEstimate, formatComparison, formatJson } from "../src/reporter.js";
import type { GasEstimate, GasComparison } from "../src/types.js";

const mockEstimate: GasEstimate = {
  gasLimit: 25200n,
  estimatedGasUsed: 21000n,
  gasPrice: 1000000000n,
  totalFee: 25200000000000n,
  usedFee: 21000000000000n,
  wastedGas: 4200n,
  wastePercent: "16.7%",
  estimatedCostMon: "0.00002520",
  estimatedCostUsd: "$0.05",
};

const mockComparison: GasComparison = {
  monad: mockEstimate,
  ethereum: {
    gasEstimate: 21000n,
    gasPrice: 30000000000n,
    estimatedCostEth: "0.00063000",
    estimatedCostUsd: "$1.26",
  },
  savings: {
    percentage: "96.0%",
    absoluteMon: "0.00002520",
  },
};

describe("formatEstimate", () => {
  it("includes gas limit", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("25,200");
  });

  it("includes estimated gas used", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("21,000");
  });

  it("includes waste info", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("4,200");
    expect(output).toContain("16.7%");
  });

  it("includes gas price", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("Gas price");
  });

  it("includes estimated cost in MON", () => {
    const output = formatEstimate(mockEstimate);
    expect(output).toContain("MON");
  });

  it("includes label when provided", () => {
    const output = formatEstimate(mockEstimate, "Test Label");
    expect(output).toContain("Test Label");
  });
});

describe("formatComparison", () => {
  it("includes Monad section", () => {
    const output = formatComparison(mockComparison);
    expect(output).toContain("Monad");
  });

  it("shows gas_limit warning", () => {
    const output = formatComparison(mockComparison);
    expect(output).toContain("gas_limit");
  });

  it("includes Ethereum section", () => {
    const output = formatComparison(mockComparison);
    expect(output).toContain("Ethereum L1");
  });

  it("includes savings", () => {
    const output = formatComparison(mockComparison);
    expect(output).toContain("96.0%");
    expect(output).toContain("cheaper on Monad");
  });

  it("handles no ethereum comparison", () => {
    const cmp: GasComparison = {
      monad: mockEstimate,
      ethereum: null,
      savings: null,
    };
    const output = formatComparison(cmp);
    expect(output).toContain("Monad");
    expect(output).not.toContain("Ethereum L1");
  });
});

describe("formatJson", () => {
  it("returns valid JSON", () => {
    const output = formatJson([
      { preset: "transfer", comparison: mockComparison },
    ]);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].preset).toBe("transfer");
  });

  it("serializes bigints as strings", () => {
    const output = formatJson([
      { preset: "transfer", comparison: mockComparison },
    ]);
    const parsed = JSON.parse(output);
    expect(parsed[0].monad.gasLimit).toBe("25200");
    expect(parsed[0].monad.estimatedGasUsed).toBe("21000");
  });

  it("includes waste data", () => {
    const output = formatJson([
      { preset: "transfer", comparison: mockComparison },
    ]);
    const parsed = JSON.parse(output);
    expect(parsed[0].monad.wastedGas).toBe("4200");
    expect(parsed[0].monad.wastePercent).toBe("16.7%");
  });

  it("includes savings", () => {
    const output = formatJson([
      { preset: "transfer", comparison: mockComparison },
    ]);
    const parsed = JSON.parse(output);
    expect(parsed[0].savings.percentage).toBe("96.0%");
  });

  it("handles null ethereum", () => {
    const cmp: GasComparison = {
      monad: mockEstimate,
      ethereum: null,
      savings: null,
    };
    const output = formatJson([{ preset: "transfer", comparison: cmp }]);
    const parsed = JSON.parse(output);
    expect(parsed[0].ethereum).toBeNull();
  });
});
