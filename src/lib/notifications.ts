import axios from 'axios';

const ONESIGNAL_APP_ID = "af9c3011-df39-423c-a2fa-832d24775f98";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

interface NotificationOptions {
  userIds?: string[];
  data?: any;
  headings?: { [key: string]: string };
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
