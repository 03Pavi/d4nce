'use client'
import React, { useState, useEffect } from 'react'
import { Box, BottomNavigation, BottomNavigationAction, Paper, Button, CircularProgress } from '@mui/material'
import { LiveTv, Alarm, VideoLibrary, Add, Logout, School, ManageAccounts } from '@mui/icons-material'
import { LiveSession } from '@/modules/live-class/components/LiveSession'
import { ReminderList } from '@/modules/reminders/components/ReminderList'
import { ReelsFeed } from '@/modules/reels/components/ReelsFeed'
import { UploadReelDialog } from '@/modules/reels/components/UploadReelDialog'
import { ClassesManagement } from '@/modules/classes/components/ClassesManagement'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const AdminPage = () => {
  const [value, setValue] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('public-stream');
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
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            router.push('/student');
        } else {
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
          // Default based on tab?
          // If tab is classes, maybe default to class-1 or keep previous?
          // For now, let's default to public-stream if not specified, 
          // but if we are in classes tab, we might want to handle it differently.
          // However, if the user navigates to classes tab without session, maybe they just want to see the list?
          // But tab 1 is LiveSession. Tab 5 is Manage Classes.
          // So Tab 1 is "Stream a Class".
          setCurrentSessionId('public-stream');
      }

      if (reelId) {
          setValue(4); // Reels tab
      } else if (tab) {
          if (tab === 'live') setValue(0);
          if (tab === 'classes') setValue(1);
          if (tab === 'reminders') setValue(2);
          if (tab === 'reels') setValue(4);
          if (tab === 'manage-classes') setValue(5);
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
              newUrl.searchParams.delete('session');
              setCurrentSessionId('public-stream');
          }
          if (newValue === 1) {
              newUrl.searchParams.set('tab', 'classes');
              // If switching to classes tab manually, maybe default to class-1?
              if (!newUrl.searchParams.get('session')) {
                  newUrl.searchParams.set('session', 'class-1');
                  setCurrentSessionId('class-1');
              }
          }
          if (newValue === 2) newUrl.searchParams.set('tab', 'reminders');
          if (newValue === 4) newUrl.searchParams.set('tab', 'reels');
          if (newValue === 5) newUrl.searchParams.set('tab', 'manage-classes');
          
          if (newValue !== 4) newUrl.searchParams.delete('reelId');
          if (newValue !== 1 && newValue !== 0) newUrl.searchParams.delete('session');
          
          window.history.replaceState({}, '', newUrl.toString());
      }
  };

  const handleUploadSuccess = () => {
    setFeedKey(prev => prev + 1);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/login');
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
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: '#111' }}>
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            startIcon={<Logout />} 
            onClick={handleLogout}
          >
            Logout
          </Button>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden', pb: 7, position: 'relative' }}>
        {value === 0 && <LiveSession role="admin" sessionId="public-stream" />}
        {value === 1 && <LiveSession role="admin" sessionId={currentSessionId} />}
        {value === 2 && <ReminderList role="admin" />}
        {value === 4 && <ReelsFeed key={feedKey} />}
        {value === 5 && <ClassesManagement />}
      </Box>
      
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#111', zIndex: 100 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => handleTabChange(newValue)}
          sx={{ bgcolor: '#111', '& .Mui-selected': { color: '#ff0055' }, '& .MuiBottomNavigationAction-root': { color: '#666' } }}
        >
          <BottomNavigationAction label="Go Live" icon={<LiveTv />} />
          <BottomNavigationAction label="Classes" icon={<School />} />
          <BottomNavigationAction label="Reminders" icon={<Alarm />} />
          <BottomNavigationAction label="New Reel" value="upload" icon={<Add />} />
          <BottomNavigationAction label="Reels" icon={<VideoLibrary />} />
          <BottomNavigationAction label="Manage" icon={<ManageAccounts />} />
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
