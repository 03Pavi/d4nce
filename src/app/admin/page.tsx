'use client'
import React, { useState, useEffect, useTransition } from 'react'
import { Box, BottomNavigation, BottomNavigationAction, Paper, IconButton, CircularProgress, Avatar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material'
import { LiveTv, VideoLibrary, AddCircle, Logout, ManageAccounts, Notifications, Person, Menu as MenuIcon } from '@mui/icons-material'
import { LiveSession } from '@/modules/classes/components/live-class/components/live-session'
import { ReminderList } from '@/modules/reminders/components/reminder-list'
import { ReelsFeed } from '@/modules/reels/components/reels-feed'
import { UploadReelDialog } from '@/modules/reels/components/upload-reel-dialog'
import { ClassesManagement } from '@/modules/classes/components/classes-management'
import { ProfileView } from '@/modules/profile/components/profile-view'
import { RecordingsList } from '@/modules/recordings/components/recordings-list'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const AdminPage = () => {
  const [value, setValue] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('public-stream');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  
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

        if (profile?.role !== 'admin') {
            router.push('/student');
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
          setValue(4); // Reels tab
      } else if (tab) {
          if (tab === 'live') setValue(0);
          if (tab === 'reminders') setValue(2);
          if (tab === 'reels') setValue(4);
          if (tab === 'manage-classes') setValue(5);
          if (tab === 'profile') setValue(6);
          if (tab === 'recordings') setValue(7);
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
              // If we want to support dynamic sessions in the main live tab, we can keep the session param if present, or default to public-stream
              if (!newUrl.searchParams.get('session')) {
                  setCurrentSessionId('public-stream');
              } else {
                  setCurrentSessionId(newUrl.searchParams.get('session') || 'public-stream');
              }
          }
          if (newValue === 2) newUrl.searchParams.set('tab', 'reminders');
          if (newValue === 4) newUrl.searchParams.set('tab', 'reels');
          if (newValue === 5) newUrl.searchParams.set('tab', 'manage-classes');
          if (newValue === 6) newUrl.searchParams.set('tab', 'profile');
          if (newValue === 7) newUrl.searchParams.set('tab', 'recordings');
          
          if (newValue !== 4) newUrl.searchParams.delete('reelId');
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
                D4NCE <Typography component="span" variant="caption" sx={{ color: '#666', ml: 1 }}>ADMIN</Typography>
            </Typography>
          </Box>

          {/* Desktop Header Actions */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <IconButton 
                onClick={() => handleTabChange(5)} 
                sx={{ color: value === 5 ? '#ff0055' : 'var(--text-secondary)' }}
              >
                <ManageAccounts />
              </IconButton>
              
              <IconButton 
                onClick={() => handleTabChange(2)} 
                sx={{ color: value === 2 ? '#ff0055' : 'var(--text-secondary)' }}
              >
                <Notifications />
              </IconButton>

              <IconButton 
                onClick={() => handleTabChange(7)} 
                sx={{ color: value === 7 ? '#ff0055' : 'var(--text-secondary)' }}
              >
                <VideoLibrary />
              </IconButton>

              <IconButton 
                onClick={() => handleTabChange(6)}
                sx={{ 
                    p: 0.5,
                    border: value === 6 ? '2px solid #ff0055' : '2px solid transparent',
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
                <Typography variant="subtitle1" fontWeight="bold">{userProfile?.full_name || 'Admin'}</Typography>
                <Typography variant="caption" sx={{ color: '#888' }}>@{userProfile?.username || 'admin'}</Typography>
            </Box>
        </Box>
        <List sx={{ pt: 2 }}>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(6); setMobileOpen(false); }} selected={value === 6}>
                    <ListItemIcon sx={{ color: value === 6 ? '#ff0055' : '#888' }}><Person /></ListItemIcon>
                    <ListItemText primary="Profile" sx={{ color: value === 6 ? '#ff0055' : 'white' }} />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(5); setMobileOpen(false); }} selected={value === 5}>
                    <ListItemIcon sx={{ color: value === 5 ? '#ff0055' : '#888' }}><ManageAccounts /></ListItemIcon>
                    <ListItemText primary="Manage Classes" sx={{ color: value === 5 ? '#ff0055' : 'white' }} />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(2); setMobileOpen(false); }} selected={value === 2}>
                    <ListItemIcon sx={{ color: value === 2 ? '#ff0055' : '#888' }}><Notifications /></ListItemIcon>
                    <ListItemText primary="Reminders" sx={{ color: value === 2 ? '#ff0055' : 'white' }} />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton onClick={() => { handleTabChange(7); setMobileOpen(false); }} selected={value === 7}>
                    <ListItemIcon sx={{ color: value === 7 ? '#ff0055' : '#888' }}><VideoLibrary /></ListItemIcon>
                    <ListItemText primary="Recordings" sx={{ color: value === 7 ? '#ff0055' : 'white' }} />
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
        <LiveSession 
            role="admin" 
            sessionId={currentSessionId} 
            isPip={value !== 0}
        />
        
        {value === 2 && <ReminderList role="admin" />}
        {value === 4 && <ReelsFeed key={feedKey} />}
        {value === 5 && <ClassesManagement />}
        {value === 6 && <ProfileView />}
        {value === 7 && <RecordingsList role="admin" />}
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
          <BottomNavigationAction label="Go Live" value={0} icon={<LiveTv />} />
          
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
          
          <BottomNavigationAction label="Reels" value={4} icon={<VideoLibrary />} />
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

export default AdminPage
