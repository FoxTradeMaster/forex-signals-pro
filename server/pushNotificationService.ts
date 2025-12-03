import webpush from 'web-push';
import { getUserPushSubscriptions, updatePushSubscriptionLastUsed } from './db';

// VAPID keys - these should be set as environment variables in production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLGdCp8cpzQF1-Jxo29SCOO6Z-wBEZbmWJQDl88miYCbGJpCefrdKlVBM7wFjLqObKiznLjtWbUGGaouLWeA2-0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'KFvnwscVfZrprrufYWwRSBXL7iEIRhfVD3qV4veDpDc';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@foxtrade.master';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  signalId?: string;
  alertType?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    const subscriptions = await getUserPushSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      console.log(`[Push] No subscriptions found for user ${userId}`);
      return { success: false, sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;

    // Send to all user's subscriptions
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        await updatePushSubscriptionLastUsed(sub.id);
        sent++;
        console.log(`[Push] Notification sent to subscription ${sub.id}`);
      } catch (error: any) {
        failed++;
        console.error(`[Push] Failed to send to subscription ${sub.id}:`, error.message);
        
        // If subscription is no longer valid (410 Gone), we should delete it
        if (error.statusCode === 410) {
          console.log(`[Push] Subscription ${sub.id} is no longer valid, should be deleted`);
          // TODO: Delete invalid subscription
        }
      }
    }

    return { success: sent > 0, sent, failed };
  } catch (error) {
    console.error('[Push] Error sending push notification:', error);
    return { success: false, sent: 0, failed: 0 };
  }
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
