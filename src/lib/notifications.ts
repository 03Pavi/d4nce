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
  url?: string;
}

export const sendNotification = async (message: string, options: NotificationOptions = {}) => {
  if (!ONESIGNAL_API_KEY) {
    const errorMsg = "❌ OneSignal API Key not found. Please set ONESIGNAL_API_KEY in environment variables.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const payload: any = {
    app_id: ONESIGNAL_APP_ID,
    contents: { en: message },
    data: options.data,
    headings: options.headings,
  };

  // Add url if specified
  if (options.url) {
    payload.url = options.url;
  }

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
    console.log(response.data, 'response.dataresponse.data')
    console.log("✅ Notification sent successfully:", {
      id: response.data.id,
      recipients: response.data.recipients,
      message: message.substring(0, 50)
    });
    return response.data;
  } catch (error: any) {
    console.error("❌ Error sending notification:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      payload: { ...payload, app_id: '***' } // Hide app_id in logs
    });
    throw error;
  }
};
