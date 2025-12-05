'use server'

import { sendNotification } from "@/lib/notifications";

export async function notifyLiveStreamStarted(instructorName: string, sessionId: string) {
  try {
    await sendNotification(`${instructorName} is now LIVE!`, {
      headings: { en: "Live Class Started" },
      data: { type: 'live_stream', sessionId },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to notify live stream:", error);
    return { success: false, error };
  }
}

export async function notifyNewReel(uploaderName: string, reelId: string) {
  try {
    await sendNotification(`${uploaderName} uploaded a new reel!`, {
      headings: { en: "New Reel" },
      data: { type: 'new_reel', reelId },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to notify new reel:", error);
    return { success: false, error };
  }
}

export async function notifyCallInvite(callerName: string, communityName: string, receiverIds: string[], roomId: string) {
  try {
    await sendNotification(`${callerName} is calling you in ${communityName}`, {
      headings: { en: "📞 Incoming Call" },
      userIds: receiverIds,
      data: { type: 'call_invite', roomId, communityName },
      ios_sound: 'notification.wav',
      android_sound: 'notification',
      web_push_topic: 'call_invite',
      priority: 10,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to notify call invite:", error);
    return { success: false, error };
  }
}

export async function notifyNewMessage(senderName: string, communityName: string, messagePreview: string, receiverIds: string[], communityId: string) {
  try {
    await sendNotification(`${senderName} in ${communityName}: ${messagePreview}`, {
      headings: { en: "New Message" },
      userIds: receiverIds,
      data: { type: 'new_message', communityId },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to notify new message:", error);
    return { success: false, error };
  }
}

export async function notifyCallAccepted(userName: string, communityName: string, callerId: string, roomId: string) {
  try {
    await sendNotification(`${userName} accepted your call in ${communityName}`, {
      headings: { en: "✅ Call Accepted" },
      userIds: [callerId],
      data: { type: 'call_accepted', roomId, communityName },
      ios_sound: 'notification.wav',
      android_sound: 'notification',
      priority: 10,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to notify call accepted:", error);
    return { success: false, error };
  }
}

export async function notifyCallDeclined(userName: string, communityName: string, callerId: string, roomId: string) {
  try {
    await sendNotification(`${userName} declined your call in ${communityName}`, {
      headings: { en: "❌ Call Declined" },
      userIds: [callerId],
      data: { type: 'call_declined', roomId, communityName },
      ios_sound: 'notification.wav',
      android_sound: 'notification',
      priority: 8,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to notify call declined:", error);
    return { success: false, error };
  }
}
