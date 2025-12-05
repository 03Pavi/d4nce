'use client'
import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  Box, 
  Typography, 
  IconButton, 
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText
} from '@mui/material'
import { Close } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface UserListDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    type: 'followers' | 'following';
    profileId: string;
}

export const UserListDialog = ({ open, onClose, title, type, profileId }: UserListDialogProps) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (open && profileId) {
            fetchUsers();
        }
    }, [open, profileId, type]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let data: any = null;
            let error: any = null;

            if (type === 'followers') {
                // Get users who follow this profile
                const result = await supabase
                    .from('follows')
                    .select('follower_id, profiles!follows_follower_id_fkey(*)')
                    .eq('following_id', profileId);
                
                if (result.data) {
                    data = result.data.map((item: any) => item.profiles);
                }
                error = result.error;
            } else {
                // Get users this profile follows
                const result = await supabase
                    .from('follows')
                    .select('following_id, profiles!follows_following_id_fkey(*)')
                    .eq('follower_id', profileId);
                
                if (result.data) {
                    data = result.data.map((item: any) => item.profiles);
                }
                error = result.error;
            }

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white', height: '50vh' } }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" fontWeight="bold">{title}</Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}><Close /></IconButton>
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress  /></Box>
                ) : users.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', color: 'var(--text-secondary)', mt: 4 }}>No users found.</Typography>
                ) : (
                    <List>
                        {users.map((user) => (
                            <ListItem key={user.id}>
                                <ListItemAvatar>
                                    <Avatar src={user.avatar_url}>{user.full_name?.[0]}</Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={<Typography color="white" fontWeight="bold">{user.full_name}</Typography>}
                                    secondary={<Typography color="var(--text-secondary)" variant="body2">@{user.username || 'user'}</Typography>}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Dialog>
    );
};
