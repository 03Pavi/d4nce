'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window {
    OneSignalDeferred: any[];
  }
}

export const OneSignalManager = () => {
  const supabase = createClient()

  useEffect(() => {
    const initOneSignal = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (typeof window !== 'undefined' && window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          if (user) {
            await OneSignal.login(user.id);
            await OneSignal.Notifications.requestPermission();
          } else {
            await OneSignal.logout();
          }
        });
      }
    }

    initOneSignal()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (typeof window !== 'undefined' && window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          if (session?.user) {
            console.log("OneSignal: Auth change - Logging in user", session.user.id);
            await OneSignal.login(session.user.id);
            await OneSignal.Notifications.requestPermission();
          } else {
            console.log("OneSignal: Auth change - Logging out");
            await OneSignal.logout();
          }
        });
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null
}
