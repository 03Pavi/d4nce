"use client";
import React, { useState, useEffect, useRef } from "react";
import {
	Box,
	Typography,
	TextField,
	IconButton,
	Avatar,
	Paper,
	CircularProgress,
	Popover,
	Chip,
} from "@mui/material";
import { Send, EmojiEmotions } from "@mui/icons-material";
import { io, Socket } from "socket.io-client";
import { messageDB, CommunityMessage } from "@/lib/message-db";
import { useRouter } from "next/navigation";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

interface CommunityChatProps {
	communityId: string;
	communityName: string;
	currentUserId: string;
}

// Idle time in milliseconds (1-3 minutes configurable)
const IDLE_TIME_MIN = 1 * 60 * 1000; // 1 minute
const IDLE_TIME_MAX = 3 * 60 * 1000; // 3 minutes
const IDLE_SYNC_TIME = 2 * 60 * 1000; // 2 minutes (middle value)

export const CommunityChat = ({
	communityId,
	communityName,
	currentUserId,
}: CommunityChatProps) => {
	const [messages, setMessages] = useState<CommunityMessage[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [userProfile, setUserProfile] = useState<any>(null);
	const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(
		null
	);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const socketRef = useRef<Socket | null>(null);
	const unsyncedCountRef = useRef(0);
	const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
	const lastActivityRef = useRef<number>(Date.now());
	const textFieldRef = useRef<HTMLInputElement>(null);
	const router = useRouter();

	useEffect(() => {
		initChat();

		// When user leaves or hides the tab, we don't sync to server anymore.
		const handleBeforeUnload = () => {
			console.log(
				"🚪 User leaving, keeping messages in IndexedDB (no server sync)"
			);
		};

		const handleVisibilityChange = () => {
			if (document.hidden) {
				console.log(
					"👁️ Tab hidden, messages remain in IndexedDB (no server sync)"
				);
			}
		};

		// Add event listeners
		window.addEventListener("beforeunload", handleBeforeUnload);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			// Component unmounts: messages remain in IndexedDB (no server sync)
			console.log(
				"🚪 Component unmounting, keeping messages in IndexedDB (no server sync)"
			);

			if (socketRef.current) {
				socketRef.current.disconnect();
			}
			// Clear idle timer on unmount
			if (idleTimerRef.current) {
				clearTimeout(idleTimerRef.current);
			}

			// Remove event listeners
			window.removeEventListener("beforeunload", handleBeforeUnload);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [communityId]);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// Start idle timer (no server syncing anymore)
	const startIdleTimer = () => {
		if (idleTimerRef.current) {
			clearTimeout(idleTimerRef.current);
		}

		lastActivityRef.current = Date.now();
		idleTimerRef.current = setTimeout(() => {
			// If idle for the configured time, we simply keep messages local
			console.log(
				"Community idle for configured time — messages remain in IndexedDB"
			);
		}, IDLE_SYNC_TIME);
	};

	const initChat = async () => {
		try {
			setLoading(true);

			// Initialize IndexedDB
			await messageDB.init();

			// Fetch user profile
			const profileRes = await fetch("/api/profile");
			if (profileRes.ok) {
				const profile = await profileRes.json();
				setUserProfile(profile);
			}

			// Load messages from IndexedDB only (no server DB fetch)
			console.log("📥 Loading messages from IndexedDB...");
			let localMessages = await messageDB.getMessages(communityId);
			setMessages(localMessages);
			console.log(
				`✅ Chat initialized with ${localMessages.length} messages from IndexedDB`
			);

			// Connect to Socket.IO
			socketRef.current = io({ path: "/socket.io" });

			// Add connection event listeners for debugging
			socketRef.current.on("connect", () => {
				console.log("✅ Socket.IO connected:", socketRef.current?.id);
			});

			socketRef.current.on("connect_error", (error) => {
				console.error("❌ Socket.IO connection error:", error);
			});

			socketRef.current.on("disconnect", (reason) => {
				console.log("🔌 Socket.IO disconnected:", reason);
			});

			socketRef.current.emit("join-community-chat", {
				communityId,
				userId: currentUserId,
			});
			console.log(`📡 Joined community chat: ${communityId}`);

			// Request message sync from other members when joining
			socketRef.current.emit("request-message-sync", {
				communityId,
				userId: currentUserId,
			});
			console.log(`🔄 Requested message sync from community members`);

			// Handle incoming sync request from other members
			socketRef.current.on("request-message-sync", async (data: any) => {
				console.log(`🔄 Received sync request from user ${data.userId}`);
				const localMessages = await messageDB.getMessages(communityId);
				if (localMessages.length > 0) {
					socketRef.current?.emit("sync-messages", {
						communityId,
						userId: currentUserId,
						messages: localMessages,
					});
					console.log(
						`📤 Sent ${localMessages.length} messages to user ${data.userId}`
					);
				}
			});

			// Handle incoming messages from sync
			socketRef.current.on("sync-messages", async (data: any) => {
				console.log(
					`📥 Received ${data.messages.length} synced messages from user ${data.userId}`
				);
				const syncedMessages = data.messages as CommunityMessage[];

				// Merge synced messages into local IndexedDB
				for (const msg of syncedMessages) {
					try {
						await messageDB.addMessage({ ...msg, synced: true });
					} catch (err) {
						console.warn(
							`Message ${msg.id} already exists or failed to add:`,
							err
						);
					}
				}

				// Update UI with merged messages
				const updatedMessages = await messageDB.getMessages(communityId);
				setMessages(updatedMessages);
				console.log(
					`✅ Synced messages merged. Total: ${updatedMessages.length}`
				);
			});

			socketRef.current.on(
				"new-community-message",
				async (message: CommunityMessage) => {
					console.log("📨 Received new message:", message);

					// Check if message already exists in state to prevent duplicates
					setMessages((prev) => {
						const exists = prev.some((m) => m.id === message.id);
						if (exists) {
							console.log("⚠️ Message already exists, skipping:", message.id);
							return prev;
						}

						// Add to IndexedDB for local persistence
						messageDB.addMessage({ ...message }).catch((err) => {
							console.warn("Message already in IndexedDB or add failed:", err);
						});

						// Reset idle timer on new message
						startIdleTimer();

						return [...prev, message];
					});
				}
			);

			// Start idle timer
			startIdleTimer();
		} catch (error) {
			console.error("Error initializing chat:", error);
		} finally {
			setLoading(false);
		}
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const syncMessages = async () => {
		console.log(
			"syncMessages called, but server sync is disabled — keeping messages in IndexedDB only"
		);
	};

	const handleSend = async () => {
		if (!newMessage.trim() || !userProfile) return;

		try {
			const message: CommunityMessage = {
				id: `${Date.now()}-${Math.random()}`,
				community_id: communityId,
				user_id: currentUserId,
				content: newMessage.trim(),
				created_at: new Date().toISOString(),
				profiles: {
					full_name: userProfile.full_name,
					avatar_url: userProfile.avatar_url,
				},
				synced: false,
			};

			// Add to IndexedDB immediately
			await messageDB.addMessage(message);
			setMessages((prev) => [...prev, message]);

			// Emit via Socket.IO for real-time
			if (socketRef.current) {
				console.log("📤 Sending message via Socket.IO:", {
					communityId,
					messageId: message.id,
					connected: socketRef.current.connected,
				});
				socketRef.current.emit("send-community-message", {
					communityId,
					message,
				});
			} else {
				console.error("❌ Socket not connected, message not sent in real-time");
			}

			// Reset idle timer - will sync to Supabase if idle for 2 minutes
			startIdleTimer();

			setNewMessage("");
		} catch (error) {
			console.error("Error sending message:", error);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleAvatarClick = (userId: string) => {
		// Navigate to profile (you can create a profile view page)
		router.push(`/profile/${userId}`);
	};

	const handleEmojiClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setEmojiAnchorEl(event.currentTarget);
	};

	const handleEmojiClose = () => {
		setEmojiAnchorEl(null);
	};

	const handleEmojiSelect = (emojiData: EmojiClickData) => {
		// Insert emoji at cursor position
		const input = textFieldRef.current;
		if (input) {
			const start = input.selectionStart || newMessage.length;
			const end = input.selectionEnd || newMessage.length;
			const newText =
				newMessage.slice(0, start) + emojiData.emoji + newMessage.slice(end);
			setNewMessage(newText);

			// Set cursor position after emoji
			setTimeout(() => {
				const newPosition = start + emojiData.emoji.length;
				input.setSelectionRange(newPosition, newPosition);
				input.focus();
			}, 0);
		} else {
			// Fallback: append to end
			setNewMessage((prev) => prev + emojiData.emoji);
		}
		handleEmojiClose();
	};

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				bgcolor: "#1a1a1a",
				borderRadius: 2,
				overflow: "hidden",
			}}
		>
			{/* Temporary/local-only chat label */}
			<Box
				sx={{
					p: 1,
					borderBottom: "1px solid rgba(255,255,255,0.04)",
					bgcolor: "#0f0f0f",
				}}
			>
				<Chip
					label="Temporary chat — stored locally"
					size="small"
					sx={{
						bgcolor: "rgba(255,152,0,0.12)",
						color: "#ffb74d",
						fontWeight: 500,
					}}
				/>
			</Box>
			<Box
				sx={{
					flex: 1,
					overflowY: "auto",
					p: 2,
					display: "flex",
					flexDirection: "column",
					gap: 2,
				}}
			>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
						<CircularProgress size={30} sx={{ color: "#ff0055" }} />
					</Box>
				) : messages.length === 0 ? (
					<Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							height: "100%",
							color: "#666",
						}}
					>
						<Typography>No messages yet. Start the conversation!</Typography>
					</Box>
				) : (
					messages.map((msg) => {
						const isMe = msg.user_id === currentUserId;
						return (
							<Box
								key={msg.id}
								sx={{
									display: "flex",
									justifyContent: isMe ? "flex-end" : "flex-start",
									gap: 1,
								}}
							>
								{!isMe && (
									<Avatar
										src={msg.profiles.avatar_url}
										sx={{
											width: 32,
											height: 32,
											mt: 0.5,
											cursor: "pointer",
											"&:hover": { opacity: 0.8 },
										}}
										onClick={() => handleAvatarClick(msg.user_id)}
									/>
								)}
								<Box sx={{ maxWidth: "70%" }}>
									{!isMe && (
										<Typography variant="caption" sx={{ color: "#888", ml: 1 }}>
											{msg.profiles.full_name}
										</Typography>
									)}
									<Paper
										sx={{
											p: 1.5,
											bgcolor: isMe ? "#ff0055" : "#333",
											color: "white",
											borderRadius: 2,
											borderTopLeftRadius: !isMe ? 0 : 2,
											borderTopRightRadius: isMe ? 0 : 2,
											position: "relative",
										}}
									>
										<Typography variant="body2">{msg.content}</Typography>
										{!msg.synced && isMe && (
											<Box
												sx={{
													position: "absolute",
													bottom: 2,
													right: 2,
													width: 6,
													height: 6,
													bgcolor: "#ffd700",
													borderRadius: "50%",
												}}
											/>
										)}
									</Paper>
									<Typography
										variant="caption"
										sx={{
											color: "#666",
											display: "block",
											textAlign: isMe ? "right" : "left",
											mt: 0.5,
											fontSize: "0.7rem",
										}}
									>
										{new Date(msg.created_at).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</Typography>
								</Box>
							</Box>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</Box>

			<Box
				sx={{
					p: 2,
					bgcolor: "#111",
					borderTop: "1px solid rgba(255,255,255,0.1)",
					display: "flex",
					gap: 1,
				}}
			>
				<TextField
					fullWidth
					placeholder="Type a message..."
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
					onKeyDown={handleKeyPress}
					size="small"
					inputRef={textFieldRef}
					sx={{
						"& .MuiOutlinedInput-root": {
							bgcolor: "rgba(255,255,255,0.05)",
							color: "white",
							"& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
							"&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
							"&.Mui-focused fieldset": { borderColor: "#ff0055" },
						},
					}}
				/>
				<IconButton
					onClick={handleEmojiClick}
					sx={{
						color: "#aaa",
						"&:hover": { color: "#ff0055", bgcolor: "rgba(255,0,85,0.1)" },
					}}
				>
					<EmojiEmotions />
				</IconButton>
				<IconButton
					onClick={handleSend}
					disabled={!newMessage.trim()}
					sx={{
						bgcolor: "#ff0055",
						color: "white",
						"&:hover": { bgcolor: "#cc0044" },
						"&.Mui-disabled": {
							bgcolor: "rgba(255,255,255,0.1)",
							color: "#666",
						},
					}}
				>
					<Send />
				</IconButton>
			</Box>

			{/* Emoji Picker Popover */}
			<Popover
				open={Boolean(emojiAnchorEl)}
				anchorEl={emojiAnchorEl}
				onClose={handleEmojiClose}
				anchorOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				transformOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
			>
				<EmojiPicker
					onEmojiClick={handleEmojiSelect}
					theme={Theme.DARK}
					width={350}
					height={400}
					searchPlaceHolder="Search emojis..."
					previewConfig={{
						showPreview: false,
					}}
				/>
			</Popover>
		</Box>
	);
};
