'use client'
import React, { useState, useEffect } from 'react'
import { Box, Typography, IconButton, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Snackbar, Alert, Card, CardContent, Chip, Fade, Container, CircularProgress } from '@mui/material'
import { Delete, Add, Alarm, NotificationsActive, Settings, AccessTime, Group } from '@mui/icons-material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { createClient } from '@/lib/supabase/client';

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
    const [newReminder, setNewReminder] = useState<{ title: string; time: Dayjs | null; forGroup: string }>({ 
        title: '', 
        time: dayjs(), 
        forGroup: '' 
    });
    
    // Admin features
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [pushMessage, setPushMessage] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

    const supabase = createClient();

    useEffect(() => {
        fetchReminders();
        requestNotificationPermission();

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
        };
    }, []);

    const fetchReminders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .order('scheduled_time', { ascending: true });
        
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

    const handleAdd = async () => {
        if (!newReminder.time || !newReminder.title.trim()) {
            setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            return;
        }
        
        const { error } = await supabase.from('reminders').insert({
            title: newReminder.title,
            scheduled_time: newReminder.time.toISOString(),
            for_group: newReminder.forGroup || 'All'
        });

        if (error) {
            setSnackbar({ open: true, message: 'Failed to add reminder', severity: 'error' });
        } else {
            setOpen(false);
            setNewReminder({ title: '', time: dayjs(), forGroup: '' });
            setSnackbar({ open: true, message: 'Reminder added successfully!', severity: 'success' });
            // Fetch will be handled by realtime, but we can also optimistic update if needed
        }
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('reminders').delete().eq('id', id);
        if (error) {
             setSnackbar({ open: true, message: 'Failed to delete reminder', severity: 'error' });
        } else {
            setSnackbar({ open: true, message: 'Reminder deleted', severity: 'info' });
        }
    }

    const handleSendPush = () => {
        if (!pushMessage.trim()) {
            setSnackbar({ open: true, message: 'Please enter a message', severity: 'error' });
            return;
        }
        // In a real app, this would call a server action to trigger Web Push
        // For now, we simulate it locally
        showNotification('Admin Announcement', pushMessage);
        setSnackbar({ open: true, message: `Push notification sent locally`, severity: 'success' });
        setNotificationOpen(false);
        setPushMessage('');
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ 
                minHeight: '100vh',
                background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
                py: { xs: 2, md: 4 }
            }}>
                <Container maxWidth="lg">
                    <Box sx={{ color: 'white' }}>
                        {/* Header Section */}
                        <Box sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                                        {role === 'admin' ? 'Manage Reminders' : 'Class Reminders'}
                                    </Typography>
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
                                                            onClick={() => handleDelete(reminder.id)} 
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
                    </Box>
                </Container>

                {/* Add Reminder Dialog - Only for Admin */}
                {role === 'admin' && (
                    <Dialog 
                        open={open} 
                        onClose={() => setOpen(false)} 
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{ 
                            sx: { 
                                bgcolor: '#1a1a1a', 
                                color: 'white',
                                borderRadius: 3,
                                border: '1px solid rgba(255,255,255,0.1)'
                            } 
                        }}
                    >
                        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Alarm sx={{ color: '#ff0055' }} />
                                <Typography variant="h6" fontWeight="bold">Set New Reminder</Typography>
                            </Box>
                        </DialogTitle>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                            <TextField
                                autoFocus
                                label="Reminder Title *"
                                fullWidth
                                placeholder="e.g., Hip Hop Class"
                                variant="outlined"
                                value={newReminder.title}
                                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                                sx={{ 
                                    '& .MuiInputBase-root': { color: 'white' },
                                    '& .MuiInputLabel-root': { color: '#aaa' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                                        '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                                    },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                                }}
                            />
                            <TimePicker
                                label="Time *"
                                value={newReminder.time}
                                onChange={(newValue) => setNewReminder({ ...newReminder, time: newValue })}
                                sx={{
                                    width: '100%',
                                    '& .MuiInputBase-root': { color: 'white' },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff0055' },
                                    '& .MuiSvgIcon-root': { color: '#ff0055' },
                                    '& .MuiInputLabel-root': { color: '#aaa' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                                }}
                            />
                             <TextField
                                label="Target Group (Optional)"
                                fullWidth
                                placeholder="e.g., Advanced, Beginners, All"
                                variant="outlined"
                                value={newReminder.forGroup}
                                onChange={(e) => setNewReminder({ ...newReminder, forGroup: e.target.value })}
                                sx={{ 
                                    '& .MuiInputBase-root': { color: 'white' },
                                    '& .MuiInputLabel-root': { color: '#aaa' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                                        '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                                    },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                                }}
                            />
                        </DialogContent>
                        <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <Button onClick={() => setOpen(false)} sx={{ color: '#888' }}>Cancel</Button>
                            <Button 
                                onClick={handleAdd} 
                                variant="contained"
                                sx={{ 
                                    bgcolor: '#ff0055',
                                    fontWeight: 'bold',
                                    '&:hover': { bgcolor: '#cc0044' }
                                }}
                            >
                                Set Reminder
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}

                {/* Push Notification Dialog - Only for Admin */}
                {role === 'admin' && (
                    <Dialog 
                        open={notificationOpen} 
                        onClose={() => setNotificationOpen(false)} 
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{ 
                            sx: { 
                                bgcolor: '#1a1a1a', 
                                color: 'white',
                                borderRadius: 3,
                                border: '1px solid rgba(0,229,255,0.3)'
                            } 
                        }}
                    >
                        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <NotificationsActive sx={{ color: '#00e5ff' }} />
                                <Typography variant="h6" fontWeight="bold">Send Push Notification</Typography>
                            </Box>
                        </DialogTitle>
                        <DialogContent sx={{ mt: 2 }}>
                            <TextField
                                autoFocus
                                label="Message"
                                fullWidth
                                multiline
                                rows={4}
                                placeholder="Wake up students! Class starts in 1 hour."
                                variant="outlined"
                                value={pushMessage}
                                onChange={(e) => setPushMessage(e.target.value)}
                                sx={{ 
                                    '& .MuiInputBase-root': { color: 'white' },
                                    '& .MuiInputLabel-root': { color: '#aaa' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                                        '&.Mui-focused fieldset': { borderColor: '#00e5ff' },
                                    },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#00e5ff' }
                                }}
                            />
                        </DialogContent>
                        <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <Button onClick={() => setNotificationOpen(false)} sx={{ color: '#888' }}>Cancel</Button>
                            <Button 
                                onClick={handleSendPush} 
                                variant="contained" 
                                sx={{ 
                                    bgcolor: '#00e5ff', 
                                    color: 'black', 
                                    fontWeight: 'bold',
                                    '&:hover': { bgcolor: '#00b2cc' }
                                }}
                            >
                                Send Notification
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}

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
            </Box>
        </LocalizationProvider>
    )
}