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
    await sendNotification(`${callerName} is inviting you to a video call in ${communityName}`, {
      headings: { en: "Incoming Video Call" },
      userIds: receiverIds,
      data: { type: 'call_invite', roomId, communityName },
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
