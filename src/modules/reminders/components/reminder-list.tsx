'use client'
import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, Snackbar, Alert, Card, CardContent, Chip, Fade, Container, CircularProgress, IconButton } from '@mui/material'
import { Delete, Add, Alarm, NotificationsActive, AccessTime, Group, Refresh } from '@mui/icons-material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { createClient } from '@/lib/supabase/client';
import { AddReminderDialog } from './add-reminder-dialog';
import { PushNotificationDialog } from './push-notification-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Reminder {
    id: string;
    title: string;
    scheduled_time: string; // ISO string from DB
    for_group: string;
}

interface ReminderListProps {
    role: 'admin' | 'student';
}

export const ReminderList = ({ role }: ReminderListProps) => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    
    // Admin features
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

    const supabase = createClient();

    useEffect(() => {
        fetchReminders();
        requestNotificationPermission();
        cleanupExpiredReminders();
        const interval = setInterval(cleanupExpiredReminders, 60000);

        // Realtime subscription
        const channel = supabase
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

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    const cleanupExpiredReminders = async () => {
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('reminders')
            .delete()
            .lt('scheduled_time', now);
        
        if (error) {
            console.error('Error cleaning up expired reminders:', error);
        }
    };

    const fetchReminders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .order('scheduled_time', { ascending: true });
        
        if (error) {
            console.error('Error fetching reminders:', error);
        }
        
        if (data) {
            setReminders(data);
        }
        setLoading(false);
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
        
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('reminders').insert({
            title: title,
            scheduled_time: time.toISOString(),
            for_group: forGroup || 'All',
            created_by: user?.id
        });

        if (error) {
            console.error('Error adding reminder:', error);
            setSnackbar({ open: true, message: 'Failed to add reminder: ' + error.message, severity: 'error' });
        } else {
            setOpen(false);
            setSnackbar({ open: true, message: 'Reminder added successfully!', severity: 'success' });
            fetchReminders();
        }
    }

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        
        const { error } = await supabase.from('reminders').delete().eq('id', deleteId);
        if (error) {
             setSnackbar({ open: true, message: 'Failed to delete reminder', severity: 'error' });
        } else {
            setSnackbar({ open: true, message: 'Reminder deleted', severity: 'info' });
            fetchReminders();
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



// ... (inside component)
    const handleRefresh = async () => {
        await fetchReminders();
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
            }}>
                {/* Fixed Header Section */}
                <Box sx={{ pt: { xs: 2, md: 4 }, pb: 2, px: 2, bgcolor: 'transparent', zIndex: 10 }}>
                    <Container maxWidth="lg">
                        <Box sx={{ color: 'white' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Typography variant="h5" fontWeight="bold">
                                            {role === 'admin' ? 'Manage Reminders' : 'Class Reminders'}
                                        </Typography>
                                        <IconButton 
                                            onClick={fetchReminders} 
                                            size="small"
                                            sx={{ 
                                                color: '#888', 
                                                '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' } 
                                            }}
                                        >
                                            <Refresh fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#888' }}>
                                        {role === 'admin' 
                                            ? 'Create and manage reminders for students'
                                            : 'Stay updated with your class schedule'
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
                            {/* Reminders List */}
                            {loading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress color="secondary" /></Box>
                            ) : reminders.length === 0 ? (
                                <Fade in={true}>
                                    <Card sx={{ 
                                        bgcolor: 'rgba(255,255,255,0.03)', 
                                        border: '1px dashed rgba(255,255,255,0.1)',
                                        textAlign: 'center',
                                        py: 8
                                    }}>
                                        <CardContent>
                                            <Alarm sx={{ fontSize: 64, color: '#333', mb: 2 }} />
                                            <Typography variant="h6" sx={{ color: '#666', mb: 1 }}>
                                                No Reminders Yet
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
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {reminders.map((reminder, index) => (
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
                                                <CardContent sx={{ p: 2.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                        <Box sx={{ 
                                                            bgcolor: 'rgba(0,229,255,0.15)', 
                                                            borderRadius: 2, 
                                                            p: 1.5,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Alarm sx={{ color: '#00e5ff', fontSize: 28 }} />
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
                    message="Are you sure you want to delete this reminder? This action cannot be undone." 
                    onConfirm={handleConfirmDelete} 
                    onCancel={() => setConfirmOpen(false)} 
                />
            </Box>
        </LocalizationProvider>
    )
}
