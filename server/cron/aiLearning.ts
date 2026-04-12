/**
 * Cron job for AI Brain self-learning
 * Runs every hour to check resolved signals and update strategy weights
 * This allows the AI to continuously improve its predictions over time
 */
import { checkAndLearnFromResolvedSignals } from "../aiSignalEngine";

async function main() {
  console.log(`[${new Date().toISOString()}] [AI Brain] Starting learning cycle...`);

  try {
    await checkAndLearnFromResolvedSignals();
    console.log(`[${new Date().toISOString()}] [AI Brain] Learning cycle complete.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [AI Brain] Learning cycle failed:`, error);
    process.exit(1);
  }
}

main();
