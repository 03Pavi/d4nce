'use client'
import React, { useState, useEffect } from 'react'
import { Box, BottomNavigation, BottomNavigationAction, Paper, Button, Fab } from '@mui/material'
import { LiveTv, Alarm, VideoLibrary, Add } from '@mui/icons-material'
import { LiveSession } from '@/modules/live-class/components/LiveSession'
import { ReminderList } from '@/modules/reminders/components/ReminderList'
import { ReelsFeed } from '@/modules/reels/components/ReelsFeed'
import { UploadReelDialog } from '@/modules/reels/components/UploadReelDialog'

import { signOut } from 'next-auth/react'
import { Logout } from '@mui/icons-material'

const AdminPage = () => {
  const [value, setValue] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  // Sync tab with URL
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const reelId = params.get('reelId');

      if (reelId) {
          setValue(3); // Reels tab
      } else if (tab) {
          if (tab === 'live') setValue(0);
          if (tab === 'reminders') setValue(1);
          if (tab === 'reels') setValue(3);
      }
  }, []);

  const handleTabChange = (newValue: any) => {
      if (newValue === 'upload') {
          setUploadOpen(true);
      } else {
          setValue(newValue);
          // Update URL
          const newUrl = new URL(window.location.href);
          if (newValue === 0) newUrl.searchParams.set('tab', 'live');
          if (newValue === 1) newUrl.searchParams.set('tab', 'reminders');
          if (newValue === 3) newUrl.searchParams.set('tab', 'reels');
          if (newValue !== 3) newUrl.searchParams.delete('reelId');
          
          window.history.replaceState({}, '', newUrl.toString());
      }
  };

  const handleUploadSuccess = () => {
    setFeedKey(prev => prev + 1);
  };

  return (
    <Box sx={{ height: '100vh', width: '100vw', bgcolor: 'black', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: '#111' }}>
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            startIcon={<Logout />} 
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Logout
          </Button>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden', pb: 7, position: 'relative' }}>
        {value === 0 && <LiveSession role="admin" />}
        {value === 1 && <ReminderList role="admin" />}
        {value === 3 && <ReelsFeed key={feedKey} />}
      </Box>
      
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#111', zIndex: 100 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => handleTabChange(newValue)}
          sx={{ bgcolor: '#111', '& .Mui-selected': { color: '#ff0055' }, '& .MuiBottomNavigationAction-root': { color: '#666' } }}
        >
          <BottomNavigationAction label="Go Live" icon={<LiveTv />} />
          <BottomNavigationAction label="Reminders" icon={<Alarm />} />
          <BottomNavigationAction label="New Reel" value="upload" icon={<Add />} />
          <BottomNavigationAction label="Reels" icon={<VideoLibrary />} />
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
