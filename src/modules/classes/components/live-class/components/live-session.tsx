import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Box,
	Button,
	Typography,
	Container,
	IconButton,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from "@mui/material";
import {
	Videocam,
	Mic,
	VideocamOff,
	GridView,
	ChatBubble,
	MicOff,
	RadioButtonChecked,
	StopCircle,
	Share,
} from "@mui/icons-material";
import { useLiveStream } from "../hooks/use-live-stream";
import { createClient } from "@/lib/supabase/client";
import { LiveSessionChat } from "./live-session-chat";
import { LiveSessionGrid } from "./live-session-grid";
import { SaveRecordingDialog } from "./save-recording-dialog";
// Live stream notification removed - do not send notifications to users

interface LiveSessionProps {
	role: "admin" | "student";
	isPaid?: boolean;
	hasPurchased?: boolean;
	sessionId?: string;
	isPip?: boolean;
	autoJoin?: boolean;
	onPipClick?: () => void;
}

export const LiveSession = ({
	role,
	isPaid = false,
	hasPurchased = false,
	sessionId = "class-1",
	isPip = false,
	autoJoin = false,
	onPipClick,
}: LiveSessionProps) => {
	const [userName, setUserName] = useState<string>(
		role === "admin" ? "Instructor" : "Student"
	);
	const [isLive, setIsLive] = useState(false);

	// Recording State
	const [isRecording, setIsRecording] = useState(false);
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<Blob[]>([]);

	// Recording Timer
	const [recordingTime, setRecordingTime] = useState(0);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	// Fetch user profile for name
	useEffect(() => {
		const fetchProfile = async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				const { data: profile } = await supabase
					.from("profiles")
					.select("full_name, username")
					.eq("id", user.id)
					.single();
				if (profile) {
					setUserName(
						profile.full_name ||
							profile.username ||
							(role === "admin" ? "Instructor" : "Student")
					);
				}
			}
		};
		fetchProfile();
	}, [role]);

	const {
		localStream,
		remoteStreams,
		remoteUsers,
		isConnected,
		chatMessages,
		sendChatMessage,
		connectedCount,
	} = useLiveStream(role, sessionId, userName, isLive);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [pinnedStreamId, setPinnedStreamId] = useState<string | null>(null);
	const [showGrid, setShowGrid] = useState(false);

	const [showChat, setShowChat] = useState(false);
	const [isMuted, setIsMuted] = useState(true);
	const [isVideoStopped, setIsVideoStopped] = useState(true);

	// PIP Draggable state
	const [pipPosition, setPipPosition] = useState(() => ({
		x: typeof window !== "undefined" ? window.innerWidth - 216 : 0,
		y: typeof window !== "undefined" ? window.innerHeight - 230 : 0,
	}));
	const pipRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

	const toggleMute = () => setIsMuted(!isMuted);
	const toggleVideo = () => setIsVideoStopped(!isVideoStopped);

	// Auto-join session if enabled
	useEffect(() => {
		if (autoJoin && !isLive) {
			setIsLive(true);
			// Don't send notification here - call invites already have their own notification
		}
	}, [autoJoin]);

	useEffect(() => {
		if (localStream) {
			localStream.getAudioTracks().forEach((track) => {
				track.enabled = !isMuted;
			});
		}
	}, [localStream, isMuted]);

	useEffect(() => {
		if (localStream) {
			localStream.getVideoTracks().forEach((track) => {
				track.enabled = !isVideoStopped;
			});
		}
	}, [localStream, isVideoStopped]);

	// Timer Logic
	useEffect(() => {
		if (isRecording) {
			timerRef.current = setInterval(() => {
				setRecordingTime((prev) => prev + 1);
			}, 1000);
		} else {
			if (timerRef.current) clearInterval(timerRef.current);
			setRecordingTime(0);
		}
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [isRecording]);

	// Auto-save on unmount or leave if recording
	useEffect(() => {
		return () => {
			if (
				isRecording &&
				mediaRecorderRef.current &&
				mediaRecorderRef.current.state === "recording"
			) {
				mediaRecorderRef.current.stop();
			}
		};
	}, [isRecording]);

	// Handle browser refresh/close
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isRecording) {
				e.preventDefault();
				e.returnValue = "";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isRecording]);

	// Determine which stream to show in main view
	const mainStream =
		pinnedStreamId === "local"
			? localStream
			: pinnedStreamId && remoteStreams[pinnedStreamId]
				? remoteStreams[pinnedStreamId]
				: Object.values(remoteStreams)[0] || localStream;

	useEffect(() => {
		if (videoRef.current && mainStream) {
			console.log("Setting main stream to video element");
			videoRef.current.srcObject = mainStream;
		}
	}, [mainStream]);

	// Ensure PIP video is visible when in PIP mode
	useEffect(() => {
		if (isPip && videoRef.current && mainStream) {
			console.log("🖼️ PIP mode active, ensuring video stream is set");
			videoRef.current.srcObject = mainStream;
		}
	}, [isPip, mainStream]);

	const handleSendMessage = (text: string) => {
		sendChatMessage(text);
	};

	const startRecording = () => {
		if (videoRef.current) {
			const stream = (videoRef.current as any).captureStream
				? (videoRef.current as any).captureStream()
				: (videoRef.current as any).mozCaptureStream
					? (videoRef.current as any).mozCaptureStream()
					: null;

			if (stream) {
				const mediaRecorder = new MediaRecorder(stream);
				mediaRecorderRef.current = mediaRecorder;
				recordedChunksRef.current = [];

				mediaRecorder.ondataavailable = (event) => {
					if (event.data.size > 0) {
						recordedChunksRef.current.push(event.data);
					}
				};

				mediaRecorder.onstop = () => {
					setSaveDialogOpen(true);
				};

				mediaRecorder.start();
				setIsRecording(true);
			} else {
				console.error("Stream capture not supported in this browser.");
				alert("Recording is not supported in this browser.");
			}
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
		}
	};

	const handleSaveRecording = (fileName: string) => {
		const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		document.body.appendChild(a);
		a.style.display = "none";
		a.href = url;
		a.download = `${fileName}.webm`;
		a.click();
		window.URL.revokeObjectURL(url);
		setSaveDialogOpen(false);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const router = useRouter();

	const handleLeave = () => {
		if (isRecording) {
			stopRecording();
			return;
		}
		setIsLive(false);

		// Remove callId, autoJoin and tab from URL when leaving the stream
		try {
			const url = new URL(window.location.href);
			url.searchParams.delete("callId");
			url.searchParams.delete("autoJoin");
			url.searchParams.delete("tab");

			const params = url.searchParams.toString();
			const newPath = url.pathname + (params ? `?${params}` : "");
			// replace URL without adding a history entry
			router.replace(newPath);
		} catch (err) {
			console.warn("Failed to update URL on leave:", err);
		}
	};

	if (role === "student" && isPaid && !hasPurchased) {
		return (
			<Box
				sx={{
					height: "100%",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					bgcolor: "#1a1a1a",
					color: "white",
					p: 3,
				}}
			>
				<Typography
					variant="h4"
					sx={{ mb: 2, fontWeight: "bold", textAlign: "center" }}
				>
					Premium Tribe
				</Typography>
				<Typography sx={{ mb: 4, textAlign: "center", color: "#a0a0a0" }}>
					Unlock this exclusive tribe to learn advanced techniques.
				</Typography>
				<Button
					variant="contained"
					size="large"
					sx={{ bgcolor: "#ff0055", "&:hover": { bgcolor: "#cc0044" } }}
				>
					Buy Ticket - $15.00
				</Button>
			</Box>
		);
	}

	// PIP Drag handlers
	const handlePipMouseDown = (e: React.MouseEvent) => {
		setIsDragging(true);
		setDragOffset({
			x: e.clientX - pipPosition.x,
			y: e.clientY - pipPosition.y,
		});
	};

	// Confirmation dialog for starting/joining stream
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmAction, setConfirmAction] = useState<"start" | "join" | null>(
		null
	);

	const openConfirm = (action: "start" | "join") => {
		setConfirmAction(action);
		setConfirmOpen(true);
	};

	const handleConfirm = async () => {
		if (confirmAction) {
			// Both start and join result in joining the live session here
			setIsLive(true);
		}
		setConfirmOpen(false);
		setConfirmAction(null);
	};

	const handleCancelConfirm = () => {
		setConfirmOpen(false);
		setConfirmAction(null);
	};

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging) return;
			const newX = Math.max(
				0,
				Math.min(e.clientX - dragOffset.x, window.innerWidth - 200)
			);
			const newY = Math.max(
				0,
				Math.min(e.clientY - dragOffset.y, window.innerHeight - 150)
			);
			setPipPosition({ x: newX, y: newY });
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging, dragOffset]);

	// PiP Mode Rendering
	if (isPip) {
		// Only show PIP if there's a stream to display (when live)
		if (!isLive || !mainStream) {
			console.log("🖼️ PIP mode but not live yet or no stream - waiting");
			return null;
		}

		return (
			<Box
				ref={pipRef}
				onMouseDown={handlePipMouseDown}
				onClick={onPipClick}
				sx={{
					position: "fixed",
					left: `${pipPosition.x}px`,
					top: `${pipPosition.y}px`,
					width: 200,
					height: 150,
					bgcolor: "black",
					borderRadius: 2,
					overflow: "hidden",
					zIndex: 9999,
					boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
					border: "1px solid rgba(255,255,255,0.1)",
					cursor: isDragging ? "grabbing" : "pointer",
					transition: isDragging ? "none" : "box-shadow 0.2s",
					"&:hover": { boxShadow: "0 6px 24px rgba(255,0,85,0.4)" },
				}}
			>
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted={mainStream === localStream}
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
				/>
				<Box sx={{ position: "absolute", top: 4, left: 4 }}>
					<Chip
						label="LIVE"
						color="error"
						size="small"
						sx={{ height: 20, fontSize: "0.6rem" }}
					/>
				</Box>
			</Box>
		);
	}

	return (
		<Container maxWidth="lg" disableGutters sx={{ height: "100%" }}>
			<Box
				sx={{
					height: "100%",
					display: "flex",
					flexDirection: "column",
					bgcolor: "black",
					position: "relative",
				}}
			>
				{/* Video Area */}
				<Box
					sx={{
						flex: showChat ? "0 0 calc(100% - 300px)" : 1, // Dynamic height
						bgcolor: "#222",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						position: "relative",
						overflow: "hidden",
						transition: "all 0.3s ease",
					}}
				>
					{/* ... (Mock Video Feed content remains same) ... */}
					<Box
						sx={{
							width: "100%",
							height: "100%",
							background: "linear-gradient(45deg, #121212, #2a2a2a)",
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						{isLive ? (
							<Box sx={{ width: "100%", height: "100%", position: "relative" }}>
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted={mainStream === localStream} // Mute self
									style={{ width: "100%", height: "100%", objectFit: "cover" }}
								/>
								{!mainStream && (
									<Box
										sx={{
											position: "absolute",
											top: "50%",
											left: "50%",
											transform: "translate(-50%, -50%)",
										}}
									>
										<Typography>Waiting for others to join...</Typography>
									</Box>
								)}
							</Box>
						) : (
							<Box sx={{ textAlign: "center" }}>
								<Videocam sx={{ fontSize: 64, color: "#333", mb: 2 }} />
								<Typography variant="h6" color="text.secondary">
									Ready to join the session?
								</Typography>
								<Button
									variant="contained"
									color="error"
									startIcon={<Videocam />}
									onClick={() => {
										// Open confirmation dialog before starting/joining
										const action =
											role === "admin" && connectedCount === 0
												? "start"
												: "join";
										openConfirm(action);
									}}
									sx={{ mt: 2 }}
								>
									{connectedCount > 0
										? "Join Tribe"
										: role === "admin"
											? "Start Live"
											: "Join Tribe"}
								</Button>
							</Box>
						)}
					</Box>

					{/* Live Badge & Timer */}
					{isLive && (
						<Box
							sx={{
								position: "absolute",
								top: 16,
								left: 16,
								display: "flex",
								alignItems: "center",
								gap: 1,
							}}
						>
							<Chip
								label="LIVE"
								color="error"
								size="small"
								sx={{ borderRadius: 1 }}
							/>
							{isRecording && (
								<Chip
									icon={
										<RadioButtonChecked
											sx={{
												fontSize: 14,
												color: "white !important",
												animation: "pulse 1.5s infinite",
											}}
										/>
									}
									label={formatTime(recordingTime)}
									size="small"
									sx={{
										bgcolor: "rgba(255, 0, 0, 0.6)",
										color: "white",
										borderRadius: 1,
										"& .MuiChip-icon": { ml: 0.5 },
									}}
								/>
							)}
						</Box>
					)}

					{/* Viewer Count & Controls Overlay */}
					{isLive && (
						<Box
							sx={{
								position: "absolute",
								top: 16,
								right: 16,
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-end",
								gap: 1,
							}}
						>
							<Chip
								label={`👥 ${connectedCount} `}
								sx={{
									bgcolor: "rgba(0,0,0,0.5)",
									color: "white",
									borderRadius: 1,
								}}
							/>
							<IconButton
								size="small"
								onClick={() => {
									const url = window.location.href;
									navigator.clipboard.writeText(url);
									alert("Link copied to clipboard!");
								}}
								sx={{
									bgcolor: "rgba(0,0,0,0.5)",
									color: "white",
									"&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
								}}
							>
								<Share />
							</IconButton>
							<IconButton
								size="small"
								onClick={() => setShowGrid(true)}
								sx={{
									bgcolor: "rgba(0,0,0,0.5)",
									color: "white",
									"&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
								}}
							>
								<GridView />
							</IconButton>
							<IconButton
								size="small"
								onClick={() => setShowChat(!showChat)}
								sx={{
									bgcolor: showChat ? "#ff0055" : "rgba(0,0,0,0.5)",
									color: "white",
									"&:hover": {
										bgcolor: showChat ? "#cc0044" : "rgba(0,0,0,0.7)",
									},
								}}
							>
								<ChatBubble />
							</IconButton>
						</Box>
					)}

					{/* Bottom Controls Overlay */}
					{isLive && (
						<Box
							sx={{
								position: "absolute",
								bottom: 16,
								left: "50%",
								transform: "translateX(-50%)",
								display: "flex",
								gap: 2,
								bgcolor: "rgba(0,0,0,0.6)",
								borderRadius: 4,
								p: 1,
							}}
						>
							<IconButton
								onClick={toggleMute}
								sx={{
									color: isMuted ? "#ff0055" : "white",
									border: "1px solid rgba(255,255,255,0.3)",
								}}
							>
								{isMuted ? <MicOff /> : <Mic />}
							</IconButton>
							<IconButton
								onClick={toggleVideo}
								sx={{
									color: isVideoStopped ? "#ff0055" : "white",
									border: "1px solid rgba(255,255,255,0.3)",
								}}
							>
								{isVideoStopped ? <VideocamOff /> : <Videocam />}
							</IconButton>

							{/* Recording Button */}
							<IconButton
								onClick={isRecording ? stopRecording : startRecording}
								sx={{
									color: isRecording ? "#ff0055" : "white",
									border: "1px solid rgba(255,255,255,0.3)",
									animation: isRecording ? "pulse 1.5s infinite" : "none",
									"@keyframes pulse": {
										"0%": { boxShadow: "0 0 0 0 rgba(255, 0, 85, 0.4)" },
										"70%": { boxShadow: "0 0 0 10px rgba(255, 0, 85, 0)" },
										"100%": { boxShadow: "0 0 0 0 rgba(255, 0, 85, 0)" },
									},
								}}
							>
								{isRecording ? <StopCircle /> : <RadioButtonChecked />}
							</IconButton>

							<Button
								variant="contained"
								color="error"
								size="small"
								onClick={handleLeave}
								sx={{ borderRadius: 4 }}
							>
								Leave
							</Button>
						</Box>
					)}
				</Box>

				{/* Chat Overlay (Conditional) */}
				{showChat && (
					<LiveSessionChat
						messages={chatMessages}
						onSendMessage={handleSendMessage}
						onClose={() => setShowChat(false)}
					/>
				)}
			</Box>

			{/* Full Screen Grid Dialog */}
			<LiveSessionGrid
				open={showGrid}
				onClose={() => setShowGrid(false)}
				localStream={localStream}
				remoteStreams={remoteStreams}
				remoteUsers={remoteUsers}
				pinnedStreamId={pinnedStreamId}
				onPinStream={setPinnedStreamId}
			/>

			{/* Save Recording Dialog */}
			<SaveRecordingDialog
				open={saveDialogOpen}
				onClose={() => setSaveDialogOpen(false)}
				onSave={handleSaveRecording}
			/>
		</Container>
	);
};
