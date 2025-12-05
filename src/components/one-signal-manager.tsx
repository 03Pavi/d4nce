"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

declare global {
	interface Window {
		OneSignalDeferred: any[];
	}
}

export const OneSignalManager = () => {
	const supabase = createClient();
	const router = useRouter();

	useEffect(() => {
		const initOneSignal = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (typeof window !== "undefined" && window.OneSignalDeferred) {
				window.OneSignalDeferred.push(async function (OneSignal: any) {
					if (user) {
						try {
							await OneSignal.login(user.id);
							await OneSignal.Notifications.requestPermission();

							// Handle notification click
							OneSignal.Notifications.addEventListener("click", (event: any) => {
								const notification = event.notification;
								console.log("🔔 Notification clicked:", notification);

								// Check if this is a call invite notification
								if (notification.data?.type === "call_invite") {
									console.log(
										"📞 Call invite detected, redirecting to communities..."
									);
									// Redirect to communities page (tab 1) to accept the call
									router.push("/student?tab=1");
								} else if (notification.data?.type === "new_reel") {
									router.push("/student?tab=2");
								} else if (notification.data?.type === "live_stream") {
									router.push("/student?tab=0");
								}
							});
						} catch (error) {
							console.error("OneSignal login/init error:", error);
						}
					} else {
						try {
							await OneSignal.logout();
						} catch (error) {
							console.error("OneSignal logout error:", error);
						}
					}
				});
			}
		};

		initOneSignal();

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (typeof window !== "undefined" && window.OneSignalDeferred) {
				window.OneSignalDeferred.push(async function (OneSignal: any) {
					if (session?.user) {
						console.log(
							"OneSignal: Auth change - Logging in user",
							session.user.id
						);
						try {
							await OneSignal.login(session.user.id);
							await OneSignal.Notifications.requestPermission();
						} catch (error) {
							console.error("OneSignal auth login error:", error);
						}
					} else {
						console.log("OneSignal: Auth change - Logging out");
						try {
							await OneSignal.logout();
						} catch (error) {
							console.error("OneSignal auth logout error:", error);
						}
					}
				});
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [router]);

	return null;
};
