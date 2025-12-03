'use client'
import React, { useState, useEffect, useTransition } from 'react'
import { Box, BottomNavigation, BottomNavigationAction, Paper, IconButton, CircularProgress, Avatar, Typography, Badge } from '@mui/material'
import { LiveTv, VideoLibrary, AddCircle, Logout, LibraryBooks, Notifications, Person } from '@mui/icons-material'
import { LiveSession } from '@/modules/live-class/components/LiveSession'
import { ReminderList } from '@/modules/reminders/components/ReminderList'
import { ReelsFeed } from '@/modules/reels/components/ReelsFeed'
import { UploadReelDialog } from '@/modules/reels/components/UploadReelDialog'
import { StudentClassesView } from '@/modules/classes/components/StudentClassesView'
import { ProfileView } from '@/modules/profile/components/ProfileView'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const StudentPage = () => {
  const [value, setValue] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('public-stream');
  const [isPending, startTransition] = useTransition()
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const checkRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile?.role === 'admin') {
            router.push('/admin');
        } else {
            setUserProfile(profile);
            setLoading(false);
        }
    };
    checkRole();
  }, [router, supabase]);

  // Sync tab with URL
  useEffect(() => {
      const tab = searchParams.get('tab');
      const reelId = searchParams.get('reelId');
      const session = searchParams.get('session');

      if (session) {
          setCurrentSessionId(session);
      } else {
          setCurrentSessionId('public-stream');
      }

      if (reelId) {
          setValue(3); // Reels tab
      } else if (tab) {
          if (tab === 'live') setValue(0);
          if (tab === 'reminders') setValue(1);
          if (tab === 'reels') setValue(3);
          if (tab === 'my-classes') setValue(4);
          if (tab === 'profile') setValue(5);
      }
  }, [searchParams]);

  const handleTabChange = (newValue: any) => {
      if (newValue === 'upload') {
          setUploadOpen(true);
      } else {
          setValue(newValue);
          // Update URL
          const newUrl = new URL(window.location.href);
          if (newValue === 0) {
              newUrl.searchParams.set('tab', 'live');
              if (!newUrl.searchParams.get('session')) {
                  setCurrentSessionId('public-stream');
              }
          }
          if (newValue === 1) newUrl.searchParams.set('tab', 'reminders');
          if (newValue === 3) newUrl.searchParams.set('tab', 'reels');
          if (newValue === 4) newUrl.searchParams.set('tab', 'my-classes');
          if (newValue === 5) newUrl.searchParams.set('tab', 'profile');
          
          if (newValue !== 3) newUrl.searchParams.delete('reelId');
          if (newValue !== 0) newUrl.searchParams.delete('session');
          
          window.history.replaceState({}, '', newUrl.toString());
      }
  };

  const handleUploadSuccess = () => {
    setFeedKey(prev => prev + 1);
  };

  const handleLogout = async () => {
    startTransition(async() => {
      await supabase.auth.signOut();
      router.push('/login');
    });
  };

  if (loading) {
      return (
          <Box sx={{ height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'black' }}>
              <CircularProgress color="secondary" />
          </Box>
      );
  }

  return (
    <Box sx={{ height: '100vh', width: '100vw', bgcolor: 'black', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        bgcolor: '#111',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Logo or Title */}
            <Typography variant="h6" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #ff0055, #ff00aa)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', ml: 1 }}>
                D4NCE
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                onClick={() => handleTabChange(4)} 
                sx={{ color: value === 4 ? '#ff0055' : 'var(--text-secondary)' }}
              >
                <LibraryBooks />
              </IconButton>
              
              <IconButton 
                onClick={() => handleTabChange(1)} 
                sx={{ color: value === 1 ? '#ff0055' : 'var(--text-secondary)' }}
              >
                <Notifications />
              </IconButton>

              <IconButton 
                onClick={() => handleTabChange(5)}
                sx={{ 
                    p: 0.5,
                    border: value === 5 ? '2px solid #ff0055' : '2px solid transparent',
                    transition: 'all 0.2s'
                }}
              >
                <Avatar 
                    src={userProfile?.avatar_url} 
                    sx={{ width: 32, height: 32 }}
                >
                    <Person />
                </Avatar>
              </IconButton>

              <IconButton 
                onClick={handleLogout}
                sx={{ color: 'var(--text-secondary)', ml: 1 }}
              >
               {isPending ? <CircularProgress size={20} /> : <Logout fontSize="small" />}
              </IconButton>
          </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', pb: 7, position: 'relative' }}>
        {value === 0 && <LiveSession role="student" isPaid={false} sessionId={currentSessionId} />}
        {value === 1 && <ReminderList role="student" />}
        {value === 3 && <ReelsFeed key={feedKey} />}
        {value === 4 && <StudentClassesView />}
        {value === 5 && <ProfileView />}
      </Box>
      
      {/* Bottom Navigation */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#111', zIndex: 100 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => handleTabChange(newValue)}
          sx={{ 
            bgcolor: '#111', 
            '& .Mui-selected': { color: '#ff0055' }, 
            '& .MuiBottomNavigationAction-root': { color: '#666' },
            height: 64
          }}
        >
          <BottomNavigationAction label="Live" value={0} icon={<LiveTv />} />
          
          <BottomNavigationAction 
            label="Create" 
            value="upload" 
            icon={
                <AddCircle sx={{ 
                    fontSize: 44, 
                    color: '#ff0055',
                    bgcolor:"#FEFEFE",
                    borderRadius:"50%",
                    padding:"0px",
                    filter: 'drop-shadow(0 0 8px rgba(255, 0, 85, 0.4))',
                }} />
            } 
            sx={{
                '& .MuiBottomNavigationAction-label': { display: 'none' }
            }}
          />
          
          <BottomNavigationAction label="Reels" value={3} icon={<VideoLibrary />} />
        </BottomNavigation>
      </Paper>

      <UploadReelDialog 
        open={uploadOpen} 
        onClose={() => setUploadOpen(false)} 
        onUploadSuccess={handleUploadSuccess}
      />
    </Box>
  )
}

export default StudentPage
