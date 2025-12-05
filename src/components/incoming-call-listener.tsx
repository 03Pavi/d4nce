"use client";
import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Avatar,
	Box,
	Snackbar,
	Alert,
} from "@mui/material";
import { Videocam, CallEnd } from "@mui/icons-material";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { RealtimeChannel } from "@supabase/supabase-js";

interface IncomingCall {
	roomId: string;
	callerId: string;
	callerName: string;
	communityName: string;
	callInviteId?: string;
}

export const IncomingCallListener = () => {
	const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
	const [channel, setChannel] = useState<RealtimeChannel | null>(null);
	const supabase = createClient();
	const router = useRouter();

	const [userRole, setUserRole] = useState<"admin" | "student" | null>(null);
	const audioRef = React.useRef<HTMLAudioElement | null>(null);

	const [notification, setNotification] = useState<{
		message: string;
		type: "success" | "error" | "info";
	} | null>(null);

	const currentCallIdRef = React.useRef<string | null>(null);

	// Audio handling effect
	useEffect(() => {
		if (incomingCall) {
			if (!audioRef.current) {
				const audio = new Audio("/sounds/ringtone.mp3");
				audio.loop = true;
				audioRef.current = audio;

				const playAudio = async () => {
					try {
						await audio.play();
					} catch (err) {
						console.log("Audio autoplay blocked, waiting for interaction", err);
						const handleInteraction = () => {
							if (audioRef.current) {
								audioRef.current.play().catch((e) => console.log("Retry play failed", e));
							}
							cleanupListeners();
						};
						const cleanupListeners = () => {
							document.removeEventListener("click", handleInteraction);
							document.removeEventListener("keydown", handleInteraction);
							document.removeEventListener("touchstart", handleInteraction);
						};
						document.addEventListener("click", handleInteraction);
						document.addEventListener("keydown", handleInteraction);
						document.addEventListener("touchstart", handleInteraction);
					}
				};
				playAudio();
			}
		} else {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		}

		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		};
	}, [incomingCall]);

	useEffect(() => {
		let currentChannel: RealtimeChannel | null = null;

		const checkPendingCalls = async () => {
			try {
				const res = await fetch("/api/call-invites");
				if (res.ok) {
					const invites = await res.json();
					if (invites && invites.length > 0) {
						const invite = invites[0];
						
						// If we are already showing this call, skip
						if (currentCallIdRef.current === invite.id) return;

						// Check if valid (created < 5 mins ago)
						const createdTime = new Date(invite.created_at).getTime();
						const now = Date.now();
						// 5 minutes validity
						if (now - createdTime < 5 * 60 * 1000) {
							console.log("Found pending call invite:", invite);
							
							currentCallIdRef.current = invite.id;
							
							setIncomingCall({
								roomId: invite.room_id,
								callerId: invite.caller_id,
								callerName: invite.profiles?.full_name || "Unknown",
								communityName: invite.communities?.name || "Community",
								callInviteId: invite.id,
							});
						}
					} else {
						// If no pending invites, but we have a call showing, it might have been cancelled/answered elsewhere
						if (currentCallIdRef.current) {
							console.log("No pending calls found, clearing current call");
							currentCallIdRef.current = null;
							setIncomingCall(null);
						}
					}
				}
			} catch (error) {
				console.error("Error checking pending calls:", error);
			}
		};

		const setupListener = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			// Fetch profile to know role
			const { data: profile } = await supabase
				.from("profiles")
				.select("role")
				.eq("id", user.id)
				.single();

			if (profile) {
				setUserRole(profile.role as "admin" | "student");
			}

			// Listen for OneSignal notifications (Foreground)
			if (typeof window !== "undefined" && window.OneSignalDeferred) {
				window.OneSignalDeferred.push(async function (OneSignal: any) {
					OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event: any) => {
						const notification = event.notification;
						console.log("🔔 Foreground notification received:", notification);
						
						if (notification.additionalData?.type === "call_invite") {
							checkPendingCalls();
						}
					});

					// Handle notification clicks (Background/Closed)
					OneSignal.Notifications.addEventListener("click", (event: any) => {
						const notification = event.notification;
						console.log("🔔 Notification clicked:", notification);
						
						if (notification.additionalData?.type === "call_invite") {
							checkPendingCalls();
						}
					});
				});
			}

			// Subscribe to call_invites changes via Postgres Changes
			const newChannel = supabase.channel(`call-invites-listener`)
				.on(
					'postgres_changes',
					{
						event: '*',
						schema: 'public',
						table: 'call_invites',
					},
					async (payload) => {
						try {
							const { new: newRecord, eventType } = payload;
							
							// 1. Handle New Incoming Call (INSERT) - As Receiver
							if (eventType === 'INSERT' && newRecord.receiver_id === user.id && newRecord.status === 'pending') {
								console.log("📞 New incoming call detected via DB:", newRecord);
								
								if (currentCallIdRef.current === newRecord.id) return;

								// Fetch caller details
								const { data: callerProfile } = await supabase
									.from('profiles')
									.select('full_name')
									.eq('id', newRecord.caller_id)
									.single();
									
								let communityName = "Community";
								if (newRecord.community_id) {
									const { data: community } = await supabase
										.from('communities')
										.select('name')
										.eq('id', newRecord.community_id)
										.single();
									if (community) communityName = community.name;
								}

								currentCallIdRef.current = newRecord.id;

								setIncomingCall({
									roomId: newRecord.room_id,
									callerId: newRecord.caller_id,
									callerName: callerProfile?.full_name || "Unknown Caller",
									communityName: communityName,
									callInviteId: newRecord.id,
								});
							}
							
							// 2. Handle Call Response (UPDATE) - As Caller
							if (eventType === 'UPDATE' && newRecord.caller_id === user.id) {
								if (newRecord.status === 'accepted' || newRecord.status === 'rejected') {
									const { data: responder } = await supabase
										.from('profiles')
										.select('full_name')
										.eq('id', newRecord.receiver_id)
										.single();
									
									const responderName = responder?.full_name || "User";
									const type = newRecord.status === 'accepted' ? 'success' : 'error';
									const action = newRecord.status === 'accepted' ? 'accepted' : 'declined';

									setNotification({
										message: `${responderName} ${action} the call`,
										type: type,
									});
								}
							}

							// 3. Handle Call Cancelled/Ended (UPDATE) - As Receiver
							if (eventType === 'UPDATE' && newRecord.receiver_id === user.id) {
								if (newRecord.status !== 'pending') {
									// Close dialog if it matches the current invite
									if (currentCallIdRef.current === newRecord.id) {
										console.log("Call no longer pending, closing dialog");
										currentCallIdRef.current = null;
										setIncomingCall(null);
									}
								}
							}
						} catch (err) {
							console.error("Error in realtime listener:", err);
						}
					}
				)
				.subscribe((status) => {
					if (status === "SUBSCRIBED") {
						console.log(`📞 Listening for call updates via DB changes`);
					}
				});

			setChannel(newChannel);
			currentChannel = newChannel;
			
			// Initial check
			checkPendingCalls();
			
			// Poll removed in favor of Realtime
		};

		setupListener();

		return () => {
			if (currentChannel) {
				supabase.removeChannel(currentChannel);
			}
		};
	}, []);

	const handleAccept = async () => {
		if (!incomingCall) return;

		try {
			// Get current user info
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			const { data: profile } = await supabase
				.from("profiles")
				.select("full_name")
				.eq("id", user.id)
				.single();

			// Update call invite status if we have the ID
			if (incomingCall.callInviteId) {
				await fetch("/api/call-invites", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: incomingCall.callInviteId,
						status: "accepted",
					}),
				}).catch((e) => console.log("Failed to update call invite", e));
			}

			// Send push notification to caller
			const { notifyCallAccepted } =
				await import("@/app/actions/notifications");
			await notifyCallAccepted(
				profile?.full_name || "User",
				incomingCall.communityName,
				incomingCall.callerId,
				incomingCall.roomId
			);

			// Navigate to call
			const targetPage = userRole === "admin" ? "/admin" : "/student";
			router.push(
				`${targetPage}?callId=${incomingCall.roomId}&autoJoin=true&tab=live`
			);
		} catch (error) {
			console.error("Error accepting call:", error);
		} finally {
			currentCallIdRef.current = null;
			setIncomingCall(null);
		}
	};

	const handleDecline = async () => {
		if (!incomingCall) return;

		try {
			// Get current user info
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			const { data: profile } = await supabase
				.from("profiles")
				.select("full_name")
				.eq("id", user.id)
				.single();

			// Update call invite status if we have the ID
			if (incomingCall.callInviteId) {
				await fetch("/api/call-invites", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: incomingCall.callInviteId,
						status: "rejected",
					}),
				}).catch((e) => console.log("Failed to update call invite", e));
			}

			// Send push notification to caller
			const { notifyCallDeclined } =
				await import("@/app/actions/notifications");
			await notifyCallDeclined(
				profile?.full_name || "User",
				incomingCall.communityName,
				incomingCall.callerId,
				incomingCall.roomId
			);
		} catch (error) {
			console.error("Error declining call:", error);
		} finally {
			currentCallIdRef.current = null;
			setIncomingCall(null);
		}
	};

	return (
		<>
			{incomingCall && (
				<Dialog
					open={!!incomingCall}
					disableEscapeKeyDown
					onClose={(e: React.SyntheticEvent, reason) => {
						// Only close if user clicks the Decline button, not by clicking outside
						if (reason === "backdropClick" || reason === "escapeKeyDown") {
							e.preventDefault();
						}
					}}
					PaperProps={{
						sx: {
							bgcolor: "#1a1a1a",
							color: "white",
							minWidth: 300,
							border: "1px solid #ff0055",
							boxShadow: "0 0 20px rgba(255, 0, 85, 0.3)",
						},
					}}
				>
					<DialogTitle sx={{ textAlign: "center", pt: 4 }}>
						<Avatar
							sx={{
								width: 80,
								height: 80,
								bgcolor: "#ff0055",
								margin: "0 auto",
								mb: 2,
								animation: "pulse 1.5s infinite",
							}}
						>
							<Videocam sx={{ fontSize: 40 }} />
						</Avatar>
						<Typography variant="h6" fontWeight="bold">
							Incoming Video Call
						</Typography>
					</DialogTitle>
					<DialogContent sx={{ textAlign: "center" }}>
						<Typography variant="body1" sx={{ mb: 1 }}>
							{incomingCall.callerName} is inviting you to a call
						</Typography>
						<Typography variant="caption" sx={{ color: "#888" }}>
							Community: {incomingCall.communityName}
						</Typography>
					</DialogContent>
					<DialogActions sx={{ justifyContent: "center", pb: 4, gap: 2 }}>
						<Button
							variant="contained"
							color="error"
							startIcon={<CallEnd />}
							onClick={handleDecline}
							sx={{ borderRadius: 50, px: 3 }}
						>
							Decline
						</Button>
						<Button
							variant="contained"
							color="success"
							startIcon={<Videocam />}
							onClick={handleAccept}
							sx={{
								borderRadius: 50,
								px: 3,
								bgcolor: "#00e676",
								"&:hover": { bgcolor: "#00c853" },
							}}
						>
							Accept
						</Button>
					</DialogActions>
				</Dialog>
			)}

			<Snackbar
				open={!!notification}
				autoHideDuration={6000}
				onClose={() => setNotification(null)}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity={notification?.type}
					onClose={() => setNotification(null)}
					sx={{ width: "100%" }}
				>
					{notification?.message}
				</Alert>
			</Snackbar>
		</>
	);
};
