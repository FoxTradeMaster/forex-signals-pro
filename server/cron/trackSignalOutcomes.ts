/**
 * Signal Performance Auto-Tracking Cron Job
 *
 * Runs every 30 minutes to:
 * 1. Fetch current prices for all active signals
 * 2. Detect TP (take profit) and SL (stop loss) hits
 * 3. Deactivate resolved signals and record outcomes in signalPerformance
 * 4. Trigger the AI Brain learning cycle for resolved signals
 *
 * Designed to run as a standalone cron job (tsx server/cron/trackSignalOutcomes.ts)
 */

import { getActiveSignals, deactivateSignal, upsertSignalPerformance, getDb } from "../db";
import { getForexPrice, getSignalStatus, calculatePL } from "../polygonService";
import { checkAndLearnFromResolvedSignals } from "../aiSignalEngine";
import { signals } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface TrackingResult {
  checked: number;
  resolved: number;
  tpHits: number;
  slHits: number;
  errors: number;
}

async function trackSignalOutcomes(): Promise<TrackingResult> {
  const result: TrackingResult = { checked: 0, resolved: 0, tpHits: 0, slHits: 0, errors: 0 };

  const activeSignals = await getActiveSignals(100);
  result.checked = activeSignals.length;

  if (activeSignals.length === 0) {
    console.log("[Track] No active signals to check.");
    return result;
  }

  console.log(`[Track] Checking ${activeSignals.length} active signal(s)...`);

  for (const signal of activeSignals) {
    try {
      const currentPrice = await getForexPrice(signal.pair);
      if (currentPrice === null) {
        console.warn(`[Track] No price for ${signal.pair}, skipping signal ${signal.id}`);
        continue;
      }

      // Always update the live P/L in signalPerformance
      const pl = calculatePL(signal, currentPrice);
      await upsertSignalPerformance({
        signalId: signal.id,
        currentPrice: currentPrice.toString(),
        plDollars: pl.plDollars.toFixed(2),
        plPips: pl.plPips.toFixed(1),
        plPercentage: pl.plPercentage.toFixed(4),
      });

      // Check if TP or SL has been hit
      const status = getSignalStatus(signal, currentPrice);

      if (status === "target_hit" || status === "stop_loss_hit") {
        // Deactivate the signal
        await deactivateSignal(signal.id);

        // Record the outcome on the signal row itself (outcomeStatus column if it exists)
        try {
          const db = await getDb();
          if (db) {
            await db
              .update(signals)
              .set({ outcomeStatus: status } as any)
              .where(eq(signals.id, signal.id));
          }
        } catch {
          // outcomeStatus column may not exist yet — non-fatal
        }

        result.resolved++;
        if (status === "target_hit") {
          result.tpHits++;
          console.log(`[Track] ✅ TP hit — ${signal.pair} ${signal.signalType} @ ${currentPrice} (TP: ${signal.takeProfit})`);
        } else {
          result.slHits++;
          console.log(`[Track] ❌ SL hit — ${signal.pair} ${signal.signalType} @ ${currentPrice} (SL: ${signal.stopLoss})`);
        }
      }
    } catch (err) {
      result.errors++;
      console.error(`[Track] Error processing signal ${signal.id}:`, err);
    }
  }

  return result;
}

async function main() {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] [Signal Tracker] Starting outcome tracking run...`);

  try {
    // Step 1: Track active signal outcomes
    const tracking = await trackSignalOutcomes();
    console.log(
      `[Signal Tracker] Checked: ${tracking.checked} | Resolved: ${tracking.resolved} ` +
      `(TP: ${tracking.tpHits}, SL: ${tracking.slHits}) | Errors: ${tracking.errors}`
    );

    // Step 2: Trigger AI Brain learning for any newly resolved signals
    if (tracking.resolved > 0) {
      console.log(`[Signal Tracker] Triggering AI Brain learning for ${tracking.resolved} resolved signal(s)...`);
      await checkAndLearnFromResolvedSignals();
      console.log("[Signal Tracker] AI Brain learning cycle complete.");
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[${new Date().toISOString()}] [Signal Tracker] Run complete in ${elapsed}s.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [Signal Tracker] Fatal error:`, error);
    process.exit(1);
  }
}

main();
