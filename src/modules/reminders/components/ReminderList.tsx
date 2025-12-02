'use client'
import React, { useState } from 'react'
import { Box, Typography, List, ListItem, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Snackbar, Alert } from '@mui/material'
import { Delete, Add, Alarm, NotificationsActive, Settings } from '@mui/icons-material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';

interface Reminder {
    id: number;
    title: string;
    time: string;
    forGroup: string;
}

interface ReminderListProps {
    role: 'admin' | 'student';
}

export const ReminderList = ({ role }: ReminderListProps) => {
    const [reminders, setReminders] = useState<Reminder[]>([
        { id: 1, title: 'Hip Hop Advanced Class', time: '10:00 AM', forGroup: 'Advanced' },
        { id: 2, title: 'Salsa Workshop Payment Due', time: '05:00 PM', forGroup: 'All' },
    ]);
    const [open, setOpen] = useState(false);
    const [newReminder, setNewReminder] = useState<{ title: string; time: Dayjs | null; forGroup: string }>({ 
        title: '', 
        time: dayjs(), 
        forGroup: '' 
    });
    
    // Admin features
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [pushMessage, setPushMessage] = useState('');
    const [limitOpen, setLimitOpen] = useState(false);
    const [reminderLimit, setReminderLimit] = useState(5);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    const handleAdd = () => {
        if (!newReminder.time) return;
        
        if (role === 'student' && reminders.length >= reminderLimit) {
            setSnackbar({ open: true, message: `You cannot set more than ${reminderLimit} reminders.` });
            return;
        }

        const timeString = newReminder.time.format('hh:mm A');
        setReminders([...reminders, { 
            id: Date.now(), 
            title: newReminder.title, 
            time: timeString, 
            forGroup: newReminder.forGroup 
        }]);
        setOpen(false);
        setNewReminder({ title: '', time: dayjs(), forGroup: '' });
    }

    const handleDelete = (id: number) => {
        setReminders(reminders.filter(r => r.id !== id));
    }

    const handleSendPush = () => {
        // Mock sending push notification
        setSnackbar({ open: true, message: `Push notification sent: "${pushMessage}"` });
        setNotificationOpen(false);
        setPushMessage('');
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: { xs: 2, md: 4 }, color: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                        {role === 'admin' ? 'Manage Reminders' : 'Your Reminders'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {role === 'admin' && (
                            <React.Fragment>
                                <Button 
                                    variant="outlined" 
                                    startIcon={<Settings />} 
                                    onClick={() => setLimitOpen(true)}
                                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
                                >
                                    Limits
                                </Button>
                                <Button 
                                    variant="contained" 
                                    startIcon={<NotificationsActive />} 
                                    onClick={() => setNotificationOpen(true)}
                                    sx={{ bgcolor: '#00e5ff', color: 'black', '&:hover': { bgcolor: '#00b2cc' } }}
                                >
                                    Wake Up!
                                </Button>
                            </React.Fragment>
                        )}
                        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}>
                            Add
                        </Button>
                    </Box>
                </Box>

                <List>
                    {reminders.map((reminder) => (
                        <ListItem 
                            key={reminder.id}
                            sx={{ 
                                bgcolor: '#1a1a1a', 
                                mb: 1, 
                                borderRadius: 2,
                                borderLeft: '4px solid #00e5ff'
                            }}
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(reminder.id)} sx={{ color: '#666' }}>
                                    <Delete />
                                </IconButton>
                            }
                        >
                            <Box sx={{ mr: 2, color: '#00e5ff' }}>
                                <Alarm />
                            </Box>
                            <ListItemText 
                                primary={reminder.title} 
                                secondary={reminder.time} 
                                primaryTypographyProps={{ color: 'white', fontWeight: 'medium' }}
                                secondaryTypographyProps={{ color: '#a0a0a0' }}
                            />
                        </ListItem>
                    ))}
                </List>

                {/* Add Reminder Dialog */}
                <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { bgcolor: '#222', color: 'white' } }}>
                    <DialogTitle>Set New Reminder</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            autoFocus
                            label="Title"
                            fullWidth
                            variant="outlined"
                            value={newReminder.title}
                            onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                            sx={{ 
                                input: { color: 'white' }, 
                                label: { color: '#aaa' }, 
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#444' },
                                    '&:hover fieldset': { borderColor: '#666' },
                                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                                }
                            }}
                        />
                        <TimePicker
                            label="Time"
                            value={newReminder.time}
                            onChange={(newValue) => setNewReminder({ ...newReminder, time: newValue })}
                            sx={{
                                width: '100%',
                                '& .MuiInputBase-root': { color: 'white' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                                '& .MuiSvgIcon-root': { color: '#ff0055' },
                                '& .MuiInputLabel-root': { color: '#aaa' },
                            }}
                        />
                         <TextField
                            label="Target Group (Optional)"
                            fullWidth
                            variant="outlined"
                            value={newReminder.forGroup}
                            onChange={(e) => setNewReminder({ ...newReminder, forGroup: e.target.value })}
                            sx={{ 
                                input: { color: 'white' }, 
                                label: { color: '#aaa' }, 
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#444' },
                                    '&:hover fieldset': { borderColor: '#666' },
                                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                                }
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpen(false)} sx={{ color: '#aaa' }}>Cancel</Button>
                        <Button onClick={handleAdd} sx={{ color: '#ff0055' }}>Set</Button>
                    </DialogActions>
                </Dialog>

                {/* Push Notification Dialog */}
                <Dialog open={notificationOpen} onClose={() => setNotificationOpen(false)} PaperProps={{ sx: { bgcolor: '#222', color: 'white' } }}>
                    <DialogTitle>Send Push Notification</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Message"
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Wake up students! Class starts in 1 hour."
                            variant="outlined"
                            value={pushMessage}
                            onChange={(e) => setPushMessage(e.target.value)}
                            sx={{ 
                                input: { color: 'white' }, 
                                textarea: { color: 'white' },
                                label: { color: '#aaa' }, 
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#444' },
                                    '&:hover fieldset': { borderColor: '#666' },
                                    '&.Mui-focused fieldset': { borderColor: '#00e5ff' },
                                }
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setNotificationOpen(false)} sx={{ color: '#aaa' }}>Cancel</Button>
                        <Button onClick={handleSendPush} variant="contained" sx={{ bgcolor: '#00e5ff', color: 'black' }}>Send</Button>
                    </DialogActions>
                </Dialog>

                {/* Limits Dialog */}
                <Dialog open={limitOpen} onClose={() => setLimitOpen(false)} PaperProps={{ sx: { bgcolor: '#222', color: 'white' } }}>
                    <DialogTitle>Set User Limits</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
                            Limit the number of reminders a student can set.
                        </Typography>
                        <TextField
                            type="number"
                            label="Max Reminders"
                            fullWidth
                            variant="outlined"
                            value={reminderLimit}
                            onChange={(e) => setReminderLimit(Number(e.target.value))}
                            sx={{ 
                                input: { color: 'white' }, 
                                label: { color: '#aaa' }, 
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#444' },
                                    '&:hover fieldset': { borderColor: '#666' },
                                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                                }
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setLimitOpen(false)} sx={{ color: '#aaa' }}>Cancel</Button>
                        <Button onClick={() => setLimitOpen(false)} sx={{ color: '#ff0055' }}>Save</Button>
                    </DialogActions>
                </Dialog>

                <Snackbar 
                    open={snackbar.open} 
                    autoHideDuration={4000} 
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="success" sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </LocalizationProvider>
    )
}
