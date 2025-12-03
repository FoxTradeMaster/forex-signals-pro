/**
 * Cron job to check signals for P/L alerts
 * Runs every 5 minutes to monitor active signals and send notifications
 */

import { checkSignalsForAlerts } from "../alertService";

async function main() {
  console.log(`[${new Date().toISOString()}] Starting alert check...`);
  
  try {
    const results = await checkSignalsForAlerts();
    console.log(`[${new Date().toISOString()}] Alert check complete:`, results);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Alert check failed:`, error);
    process.exit(1);
  }
}

main();
