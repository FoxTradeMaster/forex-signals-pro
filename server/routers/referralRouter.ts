import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { generateReferralCode, getReferralStats, trackReferral, getSignalOfTheDay } from "../db";

export const referralRouter = router({
  /**
   * Get or generate the current user's referral code and stats
   */
  getMyReferral: protectedProcedure.query(async ({ ctx }) => {
    const code = await generateReferralCode(ctx.user.id);
    const stats = await getReferralStats(ctx.user.id);
    const baseUrl = process.env.VITE_APP_URL || "https://foxtrademaster.com";
    return {
      referralCode: code,
      referralCount: stats.referralCount,
      referralLink: `${baseUrl}/activate?ref=${code}`,
      trialLink: `${baseUrl}/premium?trial=true&ref=${code}`,
    };
  }),

  /**
   * Track a referral when a user signs up via a referral link
   */
  trackReferral: publicProcedure
    .input(z.object({ referralCode: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      const success = await trackReferral(input.referralCode, input.userId);
      return { success };
    }),

  /**
   * Get the Signal of the Day (highest AI confidence signal)
   */
  getSignalOfTheDay: publicProcedure.query(async () => {
    const signal = await getSignalOfTheDay();
    return signal;
  }),
});
