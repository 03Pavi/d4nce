"use client";
import React, { useState, useEffect } from "react";
import {
	Box,
	Typography,
	Grid,
	Card,
	CardContent,
	Button,
	Chip,
	TextField,
	InputAdornment,
	Tabs,
	Tab,
	CircularProgress,
	IconButton,
} from "@mui/material";
import { Search, ArrowBack, GroupAdd, GroupRemove } from "@mui/icons-material";
import { createClient } from "@/lib/supabase/client";
import { ReelsFeed } from "@/modules/reels/components/reels-feed";
import { CommunityChat } from "./community-chat";
import { StartCallDialog } from "./start-call-dialog";
import { VideoCall } from "@mui/icons-material";
import { io } from "socket.io-client";
import { notifyCallInvite } from "@/app/actions/notifications";

interface Community {
	id: string;
	name: string;
	tags: string[];
	admin_id: string;
	member_count?: number;
	join_policy: "open" | "approval_required";
	description?: string;
}

// Helper component to render tags with overflow handling for small screens
const TagDisplay = ({
	tags,
	maxVisibleOnSmall = 2,
}: {
	tags: string[];
	maxVisibleOnSmall?: number;
}) => {
	return (
		<>
			{/* Show all tags on large screens, limited on small screens */}
			{tags.map((tag, index) => (
				<Box
					key={tag}
					sx={{
						display: {
							xs: index < maxVisibleOnSmall ? "inline-flex" : "none",
							sm: "inline-flex",
						},
					}}
				>
					<Chip
						label={tag}
						size="small"
						sx={{
							bgcolor: "rgba(255,255,255,0.1)",
							color: "#ccc",
							fontSize: "0.75rem",
						}}
					/>
				</Box>
			))}

			{/* Show +N indicator on small screens if there are more tags */}
			{tags.length > maxVisibleOnSmall && (
				<Box sx={{ display: { xs: "inline-flex", sm: "none" } }}>
					<Chip
						label={`+${tags.length - maxVisibleOnSmall}`}
						size="small"
						sx={{
							bgcolor: "rgba(255,0,85,0.2)",
							color: "#ff0055",
							fontSize: "0.75rem",
							fontWeight: "bold",
						}}
					/>
				</Box>
			)}
		</>
	);
};

export const CommunitiesList = () => {
	const [communities, setCommunities] = useState<Community[]>([]);
	const [membershipStatus, setMembershipStatus] = useState<
		Record<string, "pending" | "approved" | "rejected">
	>({});
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [tabValue, setTabValue] = useState(0);
	const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
		null
	);
	const [viewTab, setViewTab] = useState(0);
	const [callDialogOpen, setCallDialogOpen] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [userProfile, setUserProfile] = useState<any>(null);

	const supabase = createClient();

	useEffect(() => {
		fetchCommunities();
	}, []);

	const fetchCommunities = async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/communities");
			if (!res.ok) throw new Error("Failed to fetch communities");

			const data = await res.json();

			setCommunities(data.communities || []);
			setMembershipStatus(data.membershipStatus || {});
			setCurrentUserId(data.userId);
			setUserProfile(data.userProfile);
		} catch (error) {
			console.error("Error fetching communities:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleJoin = async (community: Community, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			if (!currentUserId) return;

			const status =
				community.join_policy === "approval_required" ? "pending" : "approved";

			const res = await fetch("/api/communities/join", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					communityId: community.id,
					joinPolicy: community.join_policy,
				}),
			});

			if (res.ok) {
				setMembershipStatus((prev) => ({ ...prev, [community.id]: status }));
				if (status === "pending") {
					alert("Request sent! Waiting for approval.");
				}
			}
		} catch (error) {
			console.error("Error joining community:", error);
		}
	};

	const handleLeave = async (communityId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			if (!currentUserId) return;

			const res = await fetch(
				`/api/communities/join?communityId=${communityId}`,
				{
					method: "DELETE",
				}
			);

			if (res.ok) {
				setMembershipStatus((prev) => {
					const newStatus = { ...prev };
					delete newStatus[communityId];
					return newStatus;
				});
			}
		} catch (error) {
			console.error("Error leaving community:", error);
		}
	};

	const filteredCommunities = communities.filter((c) => {
		const matchesSearch =
			c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

		if (tabValue === 1) {
			// My Communities
			return matchesSearch && membershipStatus[c.id] === "approved";
		}
		return matchesSearch;
	});

	const handleStartCall = async (selectedUserIds: string[]) => {
		if (!selectedCommunity || !currentUserId) return;

		const roomId = `room-${selectedCommunity.id}-${Date.now()}`;

		try {
			// 1. Create invites in DB
			const invites = selectedUserIds.map((userId) => ({
				community_id: selectedCommunity.id,
				caller_id: currentUserId,
				receiver_id: userId,
				room_id: roomId,
				status: "pending",
			}));

			const { error } = await fetch("/api/call-invites", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ invites }),
			}).then((res) => (res.ok ? { error: null } : { error: "Failed" }));

			if (error) throw error;

			// 2. Emit Socket Event to notify users
			const socket = io({ path: "/socket.io" });

			// We need to fetch the caller's name to show in the notification
			const callerName = userProfile?.full_name || "Member";

			socket.emit("initiate-call", {
				roomId,
				callerId: currentUserId,
				callerName,
				communityName: selectedCommunity.name,
				receiverIds: selectedUserIds,
			});

			// Send Push Notification
			await notifyCallInvite(
				callerName,
				selectedCommunity.name,
				selectedUserIds,
				roomId
			);

			// 3. Navigate to the call room immediately
			window.location.href = `/student?callId=${roomId}&autoJoin=true&tab=live`;
		} catch (error) {
			console.error("Error starting call:", error);
			alert("Failed to start call.");
		}
	};

	if (selectedCommunity) {
		return (
			<Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
				<Box
					sx={{
						p: 2,
						display: "flex",
						alignItems: "center",
						bgcolor: "#111",
						borderBottom: "1px solid rgba(255,255,255,0.1)",
					}}
				>
					<IconButton
						onClick={() => setSelectedCommunity(null)}
						sx={{ color: "white", mr: 1 }}
					>
						<ArrowBack />
					</IconButton>
					<Box sx={{ flex: 1 }}>
						<Typography
							variant="h6"
							sx={{ color: "white", fontWeight: "bold" }}
						>
							{selectedCommunity.name}
						</Typography>
						<Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
							<TagDisplay tags={selectedCommunity.tags} maxVisibleOnSmall={2} />
						</Box>
					</Box>
					{viewTab === 1 && (
						<Button
							variant="contained"
							size="small"
							startIcon={<VideoCall />}
							onClick={() => setCallDialogOpen(true)}
							sx={{ bgcolor: "#ff0055", "&:hover": { bgcolor: "#cc0044" } }}
						>
							Call
						</Button>
					)}
				</Box>

				<Tabs
					value={viewTab}
					onChange={(e, v) => setViewTab(v)}
					sx={{
						bgcolor: "#111",
						borderBottom: "1px solid rgba(255,255,255,0.1)",
						"& .MuiTab-root": { color: "#888" },
						"& .Mui-selected": { color: "#ff0055" },
						"& .MuiTabs-indicator": { bgcolor: "#ff0055" },
					}}
				>
					<Tab label="Feed" />
					<Tab label="Chat" />
					<Tab label="About" />
				</Tabs>

				<Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
					{viewTab === 0 && (
						// @ts-ignore
						<ReelsFeed
							communityId={selectedCommunity.id}
							disableUrlSync={true}
						/>
					)}
					{viewTab === 1 && currentUserId && (
						<CommunityChat
							communityId={selectedCommunity.id}
							communityName={selectedCommunity.name}
							currentUserId={currentUserId}
						/>
					)}
					{viewTab === 2 && (
						<Box sx={{ p: 3, color: "white" }}>
							<Typography variant="h6" sx={{ mb: 2 }}>
								About {selectedCommunity.name}
							</Typography>
							<Typography
								variant="body1"
								sx={{ color: "#ccc", whiteSpace: "pre-wrap" }}
							>
								{selectedCommunity.description || "No description provided."}
							</Typography>
						</Box>
					)}
				</Box>

				{currentUserId && (
					<StartCallDialog
						open={callDialogOpen}
						onClose={() => setCallDialogOpen(false)}
						communityId={selectedCommunity.id}
						currentUserId={currentUserId}
						onStartCall={handleStartCall}
					/>
				)}
			</Box>
		);
	}

	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
				bgcolor: "black",
				color: "white",
			}}
		>
			<Box sx={{ p: 2, bgcolor: "#111" }}>
				<Typography
					variant="h5"
					sx={{
						mb: 2,
						fontWeight: "bold",
						background: "linear-gradient(45deg, #ff0055, #ff00aa)",
						backgroundClip: "text",
						WebkitBackgroundClip: "text",
						color: "transparent",
					}}
				>
					Communities
				</Typography>

				<TextField
					fullWidth
					placeholder="Search communities or tags..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<Search sx={{ color: "#666" }} />
							</InputAdornment>
						),
					}}
					sx={{
						mb: 2,
						"& .MuiOutlinedInput-root": {
							bgcolor: "rgba(255,255,255,0.05)",
							color: "white",
							"& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
							"&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
							"&.Mui-focused fieldset": { borderColor: "#ff0055" },
						},
					}}
				/>

				<Tabs
					value={tabValue}
					onChange={(e, v) => setTabValue(v)}
					sx={{
						"& .MuiTab-root": { color: "#888" },
						"& .Mui-selected": { color: "#ff0055" },
						"& .MuiTabs-indicator": { bgcolor: "#ff0055" },
					}}
				>
					<Tab label="Explore" />
					<Tab label="My Communities" />
				</Tabs>
			</Box>

			<Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
						<CircularProgress sx={{ color: "#ff0055" }} />
					</Box>
				) : (
					<Grid container spacing={2}>
						{filteredCommunities.map((community) => (
							<Grid item xs={12} sm={6} md={4} key={community.id}>
								<Card
									onClick={() => {
										setSelectedCommunity(community);
										setViewTab(1); // Default to Chat
									}}
									sx={{
										bgcolor: "#1a1a1a",
										color: "white",
										cursor: "pointer",
										transition: "transform 0.2s",
										"&:hover": { transform: "translateY(-4px)" },
										border: "1px solid rgba(255,255,255,0.1)",
									}}
								>
									<CardContent>
										<Box
											sx={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "start",
												mb: 1,
											}}
										>
											<Typography variant="h6" sx={{ fontWeight: "bold" }}>
												{community.name}
											</Typography>
											{membershipStatus[community.id] ? (
												membershipStatus[community.id] === "approved" ? (
													<Button
														size="small"
														variant="outlined"
														color="error"
														onClick={(e) => handleLeave(community.id, e)}
														startIcon={<GroupRemove />}
														sx={{
															borderColor: "rgba(255,0,0,0.5)",
															color: "#ff4444",
														}}
													>
														Leave
													</Button>
												) : (
													<Button
														size="small"
														variant="outlined"
														disabled
														sx={{
															borderColor: "rgba(255,255,255,0.3)",
															color: "#888",
														}}
													>
														Pending
													</Button>
												)
											) : (
												<Button
													size="small"
													variant="contained"
													onClick={(e) => handleJoin(community, e)}
													startIcon={<GroupAdd />}
													sx={{
														bgcolor: "#ff0055",
														"&:hover": { bgcolor: "#cc0044" },
													}}
												>
													{community.join_policy === "approval_required"
														? "Request"
														: "Join"}
												</Button>
											)}
										</Box>

										<Box
											sx={{
												display: "flex",
												flexWrap: "wrap",
												gap: 0.5,
												mt: 2,
											}}
										>
											<TagDisplay
												tags={community.tags || []}
												maxVisibleOnSmall={2}
											/>
										</Box>
									</CardContent>
								</Card>
							</Grid>
						))}

						{filteredCommunities.length === 0 && (
							<Box
								sx={{
									width: "100%",
									textAlign: "center",
									mt: 4,
									color: "#666",
								}}
							>
								<Typography>No communities found.</Typography>
							</Box>
						)}
					</Grid>
				)}
			</Box>
		</Box>
	);
};
