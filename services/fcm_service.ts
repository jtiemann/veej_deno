// services/fcm_service.ts - Firebase Cloud Messaging integration
import { config } from "../config.ts";

// In-memory storage for FCM tokens
const tokenRegistry = new Map<string, string>();

/**
 * Register a user's FCM token
 */
export function registerToken(user: string, token: string): void {
  console.log(`Registering FCM token for user ${user}`);
  tokenRegistry.set(user, token);
}

/**
 * Remove a user's FCM token
 */
export function removeToken(user: string): void {
  console.log(`Removing FCM token for user ${user}`);
  tokenRegistry.delete(user);
}

/**
 * Get a user's FCM token
 */
export function getToken(user: string): string | undefined {
  return tokenRegistry.get(user);
}

/**
 * Get all registered users and their tokens
 */
export function getAllTokens(): [string, string][] {
  return Array.from(tokenRegistry.entries());
}

/**
 * Send a notification to a user
 */
export async function sendNotification(recipient: string, sender: string): Promise<boolean> {
  if (!config.fcm.enabled) {
    console.log("FCM notifications disabled in configuration");
    return false;
  }
  
  const token = tokenRegistry.get(recipient);
  if (!token) {
    console.log(`No FCM token found for recipient: ${recipient}`);
    return false;
  }
  
  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${config.fcm.apiKey}`
      },
      body: JSON.stringify({
        notification: {
          title: "Veejr Awaits",
          body: `From: ${sender}`,
          sound: "default",
          click_action: "FCM_PLUGIN_ACTIVITY",
          icon: "fcm_push_icon"
        },
        data: {
          sender: sender,
          something: "valueOfSomething"
        },
        to: token,
        priority: "high"
      })
    });
    
    if (response.ok) {
      console.log(`Notification sent to ${recipient} from ${sender}`);
      return true;
    } else {
      const errorData = await response.json();
      console.error("FCM notification failed:", errorData);
      return false;
    }
  } catch (error) {
    console.error("Error sending FCM notification:", error);
    return false;
  }
}