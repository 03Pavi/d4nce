'use client'
import React, { useState, useEffect, useTransition } from 'react'
import { Box, BottomNavigation, BottomNavigationAction, Paper, IconButton, CircularProgress, Avatar, Typography, Badge, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material'
import { LiveTv, VideoLibrary, AddCircle, Logout, LibraryBooks, Notifications, Person, Menu as MenuIcon, Groups } from '@mui/icons-material'
import { LiveSession } from '@/modules/classes/components/live-class/components/live-session'
import { ReminderList } from '@/modules/reminders/components/reminder-list'
import { ReelsFeed } from '@/modules/reels/components/reels-feed'
import { UploadReelDialog } from '@/modules/reels/components/upload-reel-dialog'
import { StudentClassesView } from '@/modules/classes/components/student-classes-view'
import { ProfileView } from '@/modules/profile/components/profile-view'
import { RecordingsList } from '@/modules/recordings/components/recordings-list'
import { CommunitiesList } from '@/modules/communities/components/communities-list'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const StudentPage = () => {
  const [value, setValue] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('public-stream');
  const [isPending, startTransition] = useTransition()
  const [userProfile, setUserProfile] = useState<any>(null);
  const [autoJoin, setAutoJoin] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const checkRole = async () => {
        try {
            const userRes = await fetch('/api/auth/user');
            if (!userRes.ok) {
                router.push('/login');
                return;
            }

            const res = await fetch('/api/profile');
            if (!res.ok) throw new Error('Failed to fetch profile');
            
            const profile = await res.json();

            if (profile?.role === 'admin') {
                router.push('/admin');
            } else {
                setUserProfile(profile);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            router.push('/login');
        }
    };
    checkRole();
  }, [router]);

  // Sync tab with URL
  useEffect(() => {
      const tab = searchParams.get('tab');
      const reelId = searchParams.get('reelId');
      const session = searchParams.get('session');
      const callId = searchParams.get('callId');
      const autoJoinParam = searchParams.get('autoJoin');

      setAutoJoin(autoJoinParam === 'true');

      if (callId) {
          setCurrentSessionId(callId);
          setValue(0); // Switch to Live tab
      } else if (session) {
          setCurrentSessionId(session);
      } else {
          setCurrentSessionId('public-stream');
      }

      if (reelId) {
          setValue(3); // Reels tab
      } else if (tab) {
          if (tab === 'live') setValue(0);
          if (tab === 'notifications') setValue(1);
          if (tab === 'reels') setValue(3);
          if (tab === 'my-classes') setValue(4);
          if (tab === 'profile') setValue(5);
          if (tab === 'profile') setValue(5);
          if (tab === 'recordings') setValue(6);
          if (tab === 'communities') setValue(7);
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
          if (newValue === 1) newUrl.searchParams.set('tab', 'notifications');
          if (newValue === 3) newUrl.searchParams.set('tab', 'reels');
          if (newValue === 4) newUrl.searchParams.set('tab', 'my-classes');
          if (newValue === 5) newUrl.searchParams.set('tab', 'profile');
          if (newValue === 5) newUrl.searchParams.set('tab', 'profile');
          if (newValue === 6) newUrl.searchParams.set('tab', 'recordings');
          if (newValue === 7) newUrl.searchParams.set('tab', 'communities');
          
          if (newValue !== 3) newUrl.searchParams.delete('reelId');
          if (newValue !== 0) newUrl.searchParams.delete('session');
          
          router.replace(newUrl.pathname + newUrl.search);
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
            <IconButton
                sx={{ display: { xs: 'flex', md: 'none' }, color: 'white', mr: 1 }}
                onClick={() => setMobileOpen(true)}
            >
                <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #ff0055, #ff00aa)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', ml: 1 }}>
                COZYTRIBE
            </Typography>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <IconButton 
                onClick={() => handleTabChange(7)} 
                sx={{ color: value === 7 ? '#ff0055' : 'var(--text-secondary)' }}
                title="Communities"
              >
                <Groups />
              </IconButton>

              <IconButton 
                onClick={() => handleTabChange(6)} 
                sx={{ color: value === 6 ? '#ff0055' : 'var(--text-secondary)' }}
                title="Class Recordings"
              >
                <VideoLibrary />
              </IconButton>

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

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
            sx: { width: 280, bgcolor: '#1a1a1a', color: 'white' }
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Avatar 
                src={userProfile?.avatar_url} 
                sx={{ width: 48, height: 48, border: '2px solid #ff0055' }}
            >
                <Person />
            </Avatar>
            <Box>
                <Typography variant="subtitle1" fontWeight="bold">{userProfile?.full_name || 'Student'}</Typography>
                <Typography variant="caption" sx={{ color: '#888' }}>@{userProfile?.username || 'student'}</Typography>
            </Box>
        </Box>
        <List sx={{ pt: 2 }}>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(5); setMobileOpen(false); }} selected={value === 5}>
                    <ListItemIcon sx={{ color: value === 5 ? '#ff0055' : '#888' }}><Person /></ListItemIcon>
                    <ListItemText primary="Profile" sx={{ color: value === 5 ? '#ff0055' : 'white' }} />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(4); setMobileOpen(false); }} selected={value === 4}>
                    <ListItemIcon sx={{ color: value === 4 ? '#ff0055' : '#888' }}><LibraryBooks /></ListItemIcon>
                    <ListItemText primary="My Tribes" sx={{ color: value === 4 ? '#ff0055' : 'white' }} />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(1); setMobileOpen(false); }} selected={value === 1}>
                    <ListItemIcon sx={{ color: value === 1 ? '#ff0055' : '#888' }}><Notifications /></ListItemIcon>
                    <ListItemText primary="Notifications" sx={{ color: value === 1 ? '#ff0055' : 'white' }} />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(6); setMobileOpen(false); }} selected={value === 6}>
                    <ListItemIcon sx={{ color: value === 6 ? '#ff0055' : '#888' }}><VideoLibrary /></ListItemIcon>
                    <ListItemText primary="Recordings" sx={{ color: value === 6 ? '#ff0055' : 'white' }} />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(7); setMobileOpen(false); }} selected={value === 7}>
                    <ListItemIcon sx={{ color: value === 7 ? '#ff0055' : '#888' }}><Groups /></ListItemIcon>
                    <ListItemText primary="Communities" sx={{ color: value === 7 ? '#ff0055' : 'white' }} />
                </ListItemButton>
            </ListItem>
            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
            <ListItem disablePadding>
                <ListItemButton onClick={handleLogout}>
                    <ListItemIcon sx={{ color: '#888' }}>
                      {isPending ? <CircularProgress size={20} /> : <Logout fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItemButton>
            </ListItem>
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', pb: 7, position: 'relative' }}>
        {value === 0 && <LiveSession role="student" isPaid={false} sessionId={currentSessionId} autoJoin={autoJoin} />}
        {value === 1 && <ReminderList role="student" />}
        {value === 3 && <ReelsFeed key={feedKey} />}
        {value === 4 && <StudentClassesView />}
        {value === 5 && <ProfileView />}
        {value === 6 && <RecordingsList role="student" />}
        {value === 7 && <CommunitiesList />}
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
