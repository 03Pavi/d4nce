'use client'
import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, Snackbar, Alert, Card, CardContent, Chip, Fade, Container, CircularProgress, IconButton } from '@mui/material'
import { useRouter } from 'next/navigation';
import { Delete, Add, Alarm, NotificationsActive, AccessTime, Group, Refresh, Videocam, Check, Close } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { createClient } from '@/lib/supabase/client';
import { AddReminderDialog } from './add-reminder-dialog';
import { PushNotificationDialog } from './push-notification-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

dayjs.extend(relativeTime);

interface Reminder {
    id: string;
    title: string;
    scheduled_time: string; // ISO string from DB
    for_group: string;
    created_at?: string;
}

interface ReminderListProps {
    role: 'admin' | 'student';
}

export const ReminderList = ({ role }: ReminderListProps) => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [callInvites, setCallInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    
    // Admin features
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        fetchReminders();
        fetchCallInvites();
        requestNotificationPermission();
        cleanupExpiredReminders();
        const interval = setInterval(cleanupExpiredReminders, 60000);

        // Realtime subscription for reminders
        const remindersChannel = supabase
            .channel('reminders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reminders' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newRec = payload.new as Reminder;
                        setReminders(prev => [...prev, newRec]);
                        showNotification(newRec.title, `New Reminder: ${dayjs(newRec.scheduled_time).format('hh:mm A')}`);
                    } else if (payload.eventType === 'DELETE') {
                        setReminders(prev => prev.filter(r => r.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Realtime subscription for call invites
        const invitesChannel = supabase
            .channel('call_invites')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'call_invites' },
                async (payload) => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    if (payload.eventType === 'INSERT' && payload.new.receiver_id === user.id && payload.new.status === 'pending') {
                        // Fetch details for the new invite
                        const { data: inviteData } = await supabase
                            .from('call_invites')
                            .select(`
                                *,
                                communities (name),
                                profiles:caller_id (full_name, avatar_url)
                            `)
                            .eq('id', payload.new.id)
                            .single();
                        
                        if (inviteData) {
                            setCallInvites(prev => [inviteData, ...prev]);
                            showNotification('Incoming Video Call', `${inviteData.profiles.full_name} is inviting you to a call in ${inviteData.communities.name}`);
                        }
                    } else if (payload.eventType === 'UPDATE' && payload.new.receiver_id === user.id && payload.new.status !== 'pending') {
                        setCallInvites(prev => prev.filter(i => i.id !== payload.new.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(remindersChannel);
            supabase.removeChannel(invitesChannel);
            clearInterval(interval);
        };
    }, []);

    const cleanupExpiredReminders = async () => {
        // This should ideally be a scheduled job or handled by the API
        // For now, we'll leave it as is or move it to the API if needed.
        // But since we are converting API calls, let's skip this client-side cleanup 
        // as it requires delete permission which the client might not have if we lock down RLS.
        // We will assume the server handles cleanup or we add a cleanup endpoint.
    };

    const fetchReminders = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reminders');
            if (!res.ok) throw new Error('Failed to fetch reminders');
            const data = await res.json();
            setReminders(data);
        } catch (error) {
            console.error('Error fetching reminders:', error);
        }
        setLoading(false);
    };

    const fetchCallInvites = async () => {
        try {
            const res = await fetch('/api/call-invites');
            if (!res.ok) throw new Error('Failed to fetch call invites');
            const data = await res.json();
            setCallInvites(data);
        } catch (error) {
            console.error('Error fetching call invites:', error);
        }
    };

    const handleAcceptCall = async (invite: any) => {
        // Update status via API
        await fetch('/api/call-invites', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: invite.id, status: 'accepted' })
        });
        
        // Navigate to call
        // Assuming we route to the student page with callId
        router.push(`/${role === 'admin' ? 'admin' : 'student'}?callId=${invite.room_id}&autoJoin=true`);
    };

    const handleRejectCall = async (inviteId: string) => {
        await fetch('/api/call-invites', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: inviteId, status: 'rejected' })
        });
        
        setCallInvites(prev => prev.filter(i => i.id !== inviteId));
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Notification permission denied');
            }
        }
    };

    const showNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icons/icon-192x192.png' });
        }
    };

    const handleAdd = async (title: string, time: Dayjs | null, forGroup: string) => {
        if (!time || !title.trim()) {
            setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            return;
        }
        
        try {
            const res = await fetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    scheduled_time: time.toISOString(),
                    for_group: forGroup || 'All'
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to add reminder');
            }

            setOpen(false);
            setSnackbar({ open: true, message: 'Reminder added successfully!', severity: 'success' });
            fetchReminders();
        } catch (error: any) {
            console.error('Error adding reminder:', error);
            setSnackbar({ open: true, message: 'Failed to add reminder: ' + error.message, severity: 'error' });
        }
    }

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        
        try {
            const res = await fetch(`/api/reminders?id=${deleteId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete');

            setSnackbar({ open: true, message: 'Reminder deleted', severity: 'info' });
            fetchReminders();
        } catch (error) {
             setSnackbar({ open: true, message: 'Failed to delete reminder', severity: 'error' });
        }
        setConfirmOpen(false);
        setDeleteId(null);
    }

    const handleSendPush = (message: string) => {
        if (!message.trim()) {
            setSnackbar({ open: true, message: 'Please enter a message', severity: 'error' });
            return;
        }
        // In a real app, this would call a server action to trigger Web Push
        // For now, we simulate it locally
        showNotification('Admin Announcement', message);
        setSnackbar({ open: true, message: `Push notification sent locally`, severity: 'success' });
        setNotificationOpen(false);
    }

    const handleRefresh = async () => {
        await fetchReminders();
        await fetchCallInvites();
    };

    // Filter logic
    const isNew = (dateString?: string) => {
        if (!dateString) return false;
        return dayjs(dateString).isAfter(dayjs().subtract(24, 'hour'));
    };

    const newReminders = reminders.filter(r => isNew(r.created_at));
    const oldReminders = reminders.filter(r => !isNew(r.created_at));

    const hasNew = callInvites.length > 0 || newReminders.length > 0;
    const hasOld = oldReminders.length > 0;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
            }}>
                {/* Fixed Header Section */}
                <Box sx={{ pt: { xs: 2, md: 4 }, pb: 2, px: { xs: 1, sm: 2 }, bgcolor: 'transparent', zIndex: 10 }}>
                    <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2 } }}>
                        <Box sx={{ color: 'white' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 'bold' }}>
                                            {role === 'admin' ? 'Manage Notifications' : 'Notifications'}
                                        </Typography>
                                        <IconButton 
                                            onClick={handleRefresh} 
                                            size="small"
                                            sx={{ 
                                                color: '#888', 
                                                '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' } 
                                            }}
                                        >
                                            <Refresh fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#888', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                        {role === 'admin' 
                                            ? 'Manage alerts, reminders, and announcements'
                                            : 'Stay updated with your classes, calls, and alerts'
                                        }
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Action Buttons - ONLY FOR ADMIN */}
                            {role === 'admin' && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button 
                                        variant="contained" 
                                        startIcon={<NotificationsActive />} 
                                        onClick={() => setNotificationOpen(true)}
                                        sx={{ 
                                            bgcolor: '#00e5ff', 
                                            color: 'black', 
                                            fontWeight: 'bold',
                                            '&:hover': { bgcolor: '#00b2cc' },
                                            minWidth: { xs: '40px', sm: 'auto' },
                                            px: { xs: 1, sm: 2 },
                                            '& .MuiButton-startIcon': {
                                                margin: { xs: 0, sm: '0 8px 0 -4px' }
                                            }
                                        }}
                                    >
                                        <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>Send Notification</Box>
                                    </Button>
                                    <Button 
                                        variant="contained" 
                                        startIcon={<Add />} 
                                        onClick={() => setOpen(true)} 
                                        sx={{ 
                                            bgcolor: '#ff0055', 
                                            fontWeight: 'bold',
                                            '&:hover': { bgcolor: '#cc0044' },
                                            minWidth: { xs: '40px', sm: 'auto' },
                                            px: { xs: 1, sm: 2 },
                                            '& .MuiButton-startIcon': {
                                                margin: { xs: 0, sm: '0 8px 0 -4px' }
                                            }
                                        }}
                                    >
                                        <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>New Reminder</Box>
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Container>
                </Box>

                {/* Scrollable List Section */}
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Container maxWidth="lg" sx={{ pb: 4 }}>
                            {loading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress  /></Box>
                            ) : reminders.length === 0 && callInvites.length === 0 ? (
                                <Fade in={true}>
                                    <Card sx={{ 
                                        bgcolor: 'rgba(255,255,255,0.03)', 
                                        border: '1px dashed rgba(255,255,255,0.1)',
                                        textAlign: 'center',
                                        py: { xs: 6, sm: 8 }
                                    }}>
                                        <CardContent>
                                            <NotificationsActive sx={{ fontSize: { xs: 48, sm: 64 }, color: '#333', mb: 2 }} />
                                            <Typography sx={{ color: '#666', mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 500 }}>
                                                No Notifications
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#444' }}>
                                                You're all caught up!
                                            </Typography>
                                            {role === 'admin' && (
                                                <Button 
                                                    variant="outlined" 
                                                    startIcon={<Add />}
                                                    onClick={() => setOpen(true)}
                                                    sx={{ 
                                                        mt: 2,
                                                        color: '#ff0055', 
                                                        borderColor: '#ff0055',
                                                        '&:hover': { borderColor: '#cc0044', bgcolor: 'rgba(255,0,85,0.1)' }
                                                    }}
                                                >
                                                    Add Reminder
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Fade>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    
                                    {/* NEW SECTION */}
                                    {hasNew && (
                                        <Box>
                                            <Typography variant="h6" sx={{ color: '#ff0055', mb: 2, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: 1 }}>
                                                New
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {/* Call Invites */}
                                                {callInvites.map((invite) => (
                                                    <Fade in={true} key={invite.id}>
                                                        <Card sx={{ 
                                                            bgcolor: 'rgba(255,0,85,0.1)', 
                                                            border: '1px solid #ff0055',
                                                            boxShadow: '0 0 20px rgba(255,0,85,0.2)'
                                                        }}>
                                                            <CardContent sx={{ 
                                                                display: 'flex', 
                                                                flexDirection: { xs: 'column', sm: 'row' },
                                                                alignItems: { xs: 'stretch', sm: 'center' }, 
                                                                justifyContent: 'space-between', 
                                                                p: 2, 
                                                                gap: { xs: 2, sm: 0 },
                                                                '&:last-child': { pb: 2 } 
                                                            }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                    <Box sx={{ position: 'relative' }}>
                                                                        <img 
                                                                            src={invite.profiles.avatar_url || '/default-avatar.png'} 
                                                                            alt={invite.profiles.full_name}
                                                                            style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} 
                                                                        />
                                                                        <Box sx={{ 
                                                                            position: 'absolute', 
                                                                            bottom: 0, 
                                                                            right: 0, 
                                                                            width: 12, 
                                                                            height: 12, 
                                                                            bgcolor: '#4caf50', 
                                                                            borderRadius: '50%', 
                                                                            border: '2px solid black' 
                                                                        }} />
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'white' }}>
                                                                            {invite.profiles.full_name}
                                                                        </Typography>
                                                                        <Typography variant="body2" sx={{ color: '#ccc' }}>
                                                                            Invited you to a call in <span style={{ color: '#ff0055' }}>{invite.communities.name}</span>
                                                                        </Typography>
                                                                        <Typography variant="caption" sx={{ color: '#888' }}>
                                                                            {dayjs(invite.created_at).fromNow()}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                                                                    <Button 
                                                                        variant="outlined" 
                                                                        color="error" 
                                                                        size="small"
                                                                        startIcon={<Close />}
                                                                        onClick={() => handleRejectCall(invite.id)}
                                                                        sx={{ flex: { xs: 1, sm: 'none' } }}
                                                                    >
                                                                        Reject
                                                                    </Button>
                                                                    <Button 
                                                                        variant="contained" 
                                                                        color="success" 
                                                                        size="small"
                                                                        startIcon={<Check />}
                                                                        onClick={() => handleAcceptCall(invite)}
                                                                        sx={{ bgcolor: '#00e676', '&:hover': { bgcolor: '#00c853' }, flex: { xs: 1, sm: 'none' } }}
                                                                    >
                                                                        Accept
                                                                    </Button>
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </Fade>
                                                ))}

                                                {/* New Reminders */}
                                                {newReminders.map((reminder, index) => (
                                                    <Fade in={true} key={reminder.id} timeout={300 + index * 100}>
                                                        <Card sx={{ 
                                                            bgcolor: 'rgba(255,255,255,0.03)', 
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderLeft: '4px solid #00e5ff',
                                                            transition: 'all 0.3s ease',
                                                            '&:hover': {
                                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                                transform: 'translateY(-2px)',
                                                                boxShadow: '0 8px 24px rgba(0,229,255,0.15)'
                                                            }
                                                        }}>
                                                            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 } }}>
                                                                    <Box sx={{ 
                                                                        bgcolor: 'rgba(0,229,255,0.15)', 
                                                                        borderRadius: 2, 
                                                                        p: { xs: 1, sm: 1.5 },
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}>
                                                                        <Alarm sx={{ color: '#00e5ff', fontSize: { xs: 24, sm: 28 } }} />
                                                                    </Box>

                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5, color: 'white' }}>
                                                                            {reminder.title}
                                                                        </Typography>
                                                                        
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <AccessTime sx={{ fontSize: 18, color: '#888' }} />
                                                                                <Typography variant="body2" sx={{ color: '#aaa' }}>
                                                                                    {dayjs(reminder.scheduled_time).format('MMM D, YYYY h:mm A')}
                                                                                </Typography>
                                                                            </Box>
                                                                            
                                                                            {reminder.for_group && (
                                                                                <Chip 
                                                                                    icon={<Group sx={{ fontSize: 16 }} />}
                                                                                    label={reminder.for_group}
                                                                                    size="small"
                                                                                    sx={{ 
                                                                                        bgcolor: 'rgba(255,0,85,0.15)',
                                                                                        color: '#ff0055',
                                                                                        border: '1px solid rgba(255,0,85,0.3)',
                                                                                        height: 24
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </Box>
                                                                    </Box>

                                                                    {role === 'admin' && (
                                                                        <IconButton 
                                                                            onClick={() => handleDeleteClick(reminder.id)} 
                                                                            sx={{ 
                                                                                color: '#666',
                                                                                '&:hover': { 
                                                                                    color: '#ff0055',
                                                                                    bgcolor: 'rgba(255,0,85,0.1)'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Delete />
                                                                        </IconButton>
                                                                    )}
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </Fade>
                                                ))}
                                            </Box>
                                        </Box>
                                    )}

                                    {/* OLD SECTION */}
                                    {hasOld && (
                                        <Box>
                                            <Typography variant="h6" sx={{ color: '#888', mb: 2, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: 1 }}>
                                                Earlier
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {oldReminders.map((reminder, index) => (
                                                    <Fade in={true} key={reminder.id} timeout={300 + index * 100}>
                                                        <Card sx={{ 
                                                            bgcolor: 'rgba(255,255,255,0.02)', 
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            transition: 'all 0.3s ease',
                                                            opacity: 0.8,
                                                            '&:hover': {
                                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                                opacity: 1
                                                            }
                                                        }}>
                                                            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 } }}>
                                                                    <Box sx={{ 
                                                                        bgcolor: 'rgba(255,255,255,0.05)', 
                                                                        borderRadius: 2, 
                                                                        p: { xs: 1, sm: 1.5 },
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}>
                                                                        <Alarm sx={{ color: '#666', fontSize: { xs: 24, sm: 28 } }} />
                                                                    </Box>

                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5, color: '#ccc' }}>
                                                                            {reminder.title}
                                                                        </Typography>
                                                                        
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <AccessTime sx={{ fontSize: 18, color: '#666' }} />
                                                                                <Typography variant="body2" sx={{ color: '#888' }}>
                                                                                    {dayjs(reminder.scheduled_time).format('MMM D, YYYY h:mm A')}
                                                                                </Typography>
                                                                            </Box>
                                                                            
                                                                            {reminder.for_group && (
                                                                                <Chip 
                                                                                    icon={<Group sx={{ fontSize: 16 }} />}
                                                                                    label={reminder.for_group}
                                                                                    size="small"
                                                                                    sx={{ 
                                                                                        bgcolor: 'rgba(255,255,255,0.05)',
                                                                                        color: '#888',
                                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                                        height: 24
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </Box>
                                                                    </Box>

                                                                    {role === 'admin' && (
                                                                        <IconButton 
                                                                            onClick={() => handleDeleteClick(reminder.id)} 
                                                                            sx={{ 
                                                                                color: '#666',
                                                                                '&:hover': { 
                                                                                    color: '#ff0055',
                                                                                    bgcolor: 'rgba(255,0,85,0.1)'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Delete />
                                                                        </IconButton>
                                                                    )}
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </Fade>
                                                ))}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Container>
                </Box>

                <AddReminderDialog 
                    open={open} 
                    onClose={() => setOpen(false)} 
                    onAdd={handleAdd} 
                />

                <PushNotificationDialog 
                    open={notificationOpen} 
                    onClose={() => setNotificationOpen(false)} 
                    onSend={handleSendPush} 
                />

                <Snackbar 
                    open={snackbar.open} 
                    autoHideDuration={4000} 
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert 
                        onClose={() => setSnackbar({ ...snackbar, open: false })} 
                        severity={snackbar.severity}
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
                <ConfirmDialog 
                    open={confirmOpen} 
                    title="Delete Reminder" 
                    message="Are you sure you want to delete this reminder?" 
                    onConfirm={handleConfirmDelete} 
                    onCancel={() => setConfirmOpen(false)} 
                />
            </Box>
        </LocalizationProvider>
    )
}
