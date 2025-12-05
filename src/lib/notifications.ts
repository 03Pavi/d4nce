import axios from 'axios';

const ONESIGNAL_APP_ID = "af9c3011-df39-423c-a2fa-832d24775f98";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

interface NotificationOptions {
  userIds?: string[];
  data?: any;
  headings?: { [key: string]: string };
  ios_sound?: string;
  android_sound?: string;
  web_push_topic?: string;
  priority?: number;
}

export const sendNotification = async (message: string, options: NotificationOptions = {}) => {
  if (!ONESIGNAL_API_KEY) {
    console.warn("OneSignal API Key not found. Please set ONESIGNAL_API_KEY in .env.local");
    return;
  }

  const payload: any = {
    app_id: ONESIGNAL_APP_ID,
    contents: { en: message },
    data: options.data,
    headings: options.headings,
  };

  // Add sound if specified
  if (options.ios_sound) {
    payload.ios_sound = options.ios_sound;
  }
  if (options.android_sound) {
    payload.android_sound = options.android_sound;
  }

  // Add priority if specified
  if (options.priority) {
    payload.priority = options.priority;
  }

  // Add web push topic if specified
  if (options.web_push_topic) {
    payload.web_push_topic = options.web_push_topic;
  }

  if (options.userIds && options.userIds.length > 0) {
    // Target specific users by their external_id (set via OneSignal.login)
    payload.include_aliases = { external_id: options.userIds };
    payload.target_channel = "push";
  } else {
    // Broadcast to all subscribed users
    payload.included_segments = ["All"];
  }

  try {
    const response = await axios.post('https://onesignal.com/api/v1/notifications', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      }
    });
    console.log("Notification sent:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error sending notification:", error.response?.data || error.message);
    throw error;
  }
};
