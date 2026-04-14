/**
 * Cron job for automatic signal generation
 * Runs every 4 hours to generate fresh trading signals for all pairs
 * This ensures signals are always available without manual intervention
 */
import { generateAISignal } from "../aiSignalEngine";
import { fetchAllForexData } from "../forexDataPolygon";
import { SignalEngine } from "../signalEngine";
import {
  saveSignal,
  clearAllSignals,
  upsertSignalPerformance,
} from "../db";
import { checkAndLearnFromResolvedSignals } from "../aiSignalEngine";

// Priority pairs for AI-enhanced signal generation (major forex pairs)
const AI_PRIORITY_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF",
  "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY",
];

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 Starting automatic signal generation...`);

  try {
    // Step 1: Learn from any resolved signals first (non-blocking)
    console.log(`[${new Date().toISOString()}] 🧠 Running AI learning cycle...`);
    try {
      await checkAndLearnFromResolvedSignals();
      console.log(`[${new Date().toISOString()}] ✅ AI learning cycle complete`);
    } catch (learnErr) {
      console.warn(`[${new Date().toISOString()}] ⚠️ AI learning cycle failed (non-critical):`, learnErr);
    }

    // Step 2: Clear old signals
    console.log(`[${new Date().toISOString()}] 🗑️ Clearing old signals...`);
    await clearAllSignals();

    // Step 3: Run AI signal generation on priority pairs in parallel
    console.log(`[${new Date().toISOString()}] 🤖 Running AI analysis on ${AI_PRIORITY_PAIRS.length} priority pairs...`);
    const aiResults = await Promise.allSettled(
      AI_PRIORITY_PAIRS.map(pair => generateAISignal(pair))
    );

    const aiSignals = aiResults
      .map((r, i) => {
        if (r.status === "fulfilled" && r.value) return r.value;
        if (r.status === "rejected") {
          console.warn(`[${new Date().toISOString()}] ⚠️ AI signal failed for ${AI_PRIORITY_PAIRS[i]}:`, r.reason?.message || r.reason);
        }
        return null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const aiPairsWithSignals = new Set(aiSignals.map(s => s.pair));
    console.log(`[${new Date().toISOString()}] ✅ AI generated ${aiSignals.length}/${AI_PRIORITY_PAIRS.length} signals`);

    // Step 4: Run standard engine for all remaining pairs
    console.log(`[${new Date().toISOString()}] 📊 Running standard signal engine for remaining pairs...`);
    const forexData = await fetchAllForexData("pro", "1h", "5d");
    const engine = new SignalEngine();
    const standardSignals = engine.generateMultipleSignals(forexData)
      .filter(s => !aiPairsWithSignals.has(s.pair));

    console.log(`[${new Date().toISOString()}] ✅ Standard engine generated ${standardSignals.length} signals`);

    // Step 5: Save AI signals to database
    let savedCount = 0;
    for (const signal of aiSignals) {
      try {
        await saveSignal({
          id: signal.id,
          pair: signal.pair,
          signalType: signal.signalType,
          strength: signal.strength.toString(),
          strategy: signal.strategy,
          entryPrice: signal.entryPrice.toString(),
          stopLoss: signal.stopLoss.toString(),
          takeProfit: signal.takeProfit.toString(),
          timeframe: signal.timeframe,
          reason: signal.aiReasoning,
          indicators: JSON.stringify(signal.indicators),
          isActive: "true",
          aiReasoning: signal.aiReasoning,
          aiConfidence: signal.aiConfidence.toString(),
          aiKeyFactors: JSON.stringify(signal.aiKeyFactors),
          aiInsight: signal.aiInsight,
          isAiGenerated: "true",
        });
        await upsertSignalPerformance({
          signalId: signal.id,
          currentPrice: signal.entryPrice.toString(),
          plDollars: "0",
          plPips: "0",
          plPercentage: "0",
        });
        savedCount++;
      } catch (saveErr) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Failed to save AI signal for ${signal.pair}:`, saveErr);
      }
    }

    // Step 6: Save standard signals to database
    for (const signal of standardSignals) {
      try {
        await saveSignal({
          id: signal.id,
          pair: signal.pair,
          signalType: signal.signalType,
          strength: signal.strength.toString(),
          strategy: signal.strategy,
          entryPrice: signal.entryPrice.toString(),
          stopLoss: signal.stopLoss.toString(),
          takeProfit: signal.takeProfit.toString(),
          timeframe: signal.timeframe,
          reason: signal.reason,
          indicators: JSON.stringify(signal.indicators),
          isActive: "true",
          isAiGenerated: "false",
        });
        await upsertSignalPerformance({
          signalId: signal.id,
          currentPrice: signal.entryPrice.toString(),
          plDollars: "0",
          plPips: "0",
          plPercentage: "0",
        });
        savedCount++;
      } catch (saveErr) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Failed to save standard signal for ${signal.pair}:`, saveErr);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${new Date().toISOString()}] 🎉 Signal generation complete!`);
    console.log(`  • AI signals: ${aiSignals.length}`);
    console.log(`  • Standard signals: ${standardSignals.length}`);
    console.log(`  • Total saved: ${savedCount}`);
    console.log(`  • Time elapsed: ${elapsed}s`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Signal generation failed:`, error);
    process.exit(1);
  }
}

main();
