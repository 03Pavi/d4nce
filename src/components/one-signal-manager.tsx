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
					} else {
						await OneSignal.logout();
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
						await OneSignal.login(session.user.id);
						await OneSignal.Notifications.requestPermission();
					} else {
						console.log("OneSignal: Auth change - Logging out");
						await OneSignal.logout();
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
