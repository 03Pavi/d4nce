'use client'
import React, { useState } from 'react'
import { Box, Typography, List, ListItem, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Snackbar, Alert, Card, CardContent, Chip, Fade, Container } from '@mui/material'
import { Delete, Add, Alarm, NotificationsActive, Settings, AccessTime, Group } from '@mui/icons-material'
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
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

    const handleAdd = () => {
        if (!newReminder.time || !newReminder.title.trim()) {
            setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            return;
        }
        
        if (role === 'student' && reminders.length >= reminderLimit) {
            setSnackbar({ open: true, message: `You cannot set more than ${reminderLimit} reminders.`, severity: 'error' });
            return;
        }

        const timeString = newReminder.time.format('hh:mm A');
        setReminders([...reminders, { 
            id: Date.now(), 
            title: newReminder.title, 
            time: timeString, 
            forGroup: newReminder.forGroup || 'Personal'
        }]);
        setOpen(false);
        setNewReminder({ title: '', time: dayjs(), forGroup: '' });
        setSnackbar({ open: true, message: 'Reminder added successfully!', severity: 'success' });
    }

    const handleDelete = (id: number) => {
        setReminders(reminders.filter(r => r.id !== id));
        setSnackbar({ open: true, message: 'Reminder deleted', severity: 'info' });
    }

    const handleSendPush = () => {
        if (!pushMessage.trim()) {
            setSnackbar({ open: true, message: 'Please enter a message', severity: 'error' });
            return;
        }
        setSnackbar({ open: true, message: `Push notification sent: "${pushMessage}"`, severity: 'success' });
        setNotificationOpen(false);
        setPushMessage('');
    }

    const handleSaveLimit = () => {
        setLimitOpen(false);
        setSnackbar({ open: true, message: `Reminder limit set to ${reminderLimit}`, severity: 'success' });
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
                                        {role === 'admin' ? 'Manage Reminders' : 'Your Reminders'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#888' }}>
                                        {role === 'admin' 
                                            ? 'Create and manage reminders for students'
                                            : `${reminders.length} of ${reminderLimit} reminders set`
                                        }
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Action Buttons */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {role === 'admin' && (
                                    <React.Fragment>
                                        <Button 
                                            variant="outlined" 
                                            startIcon={<Settings />} 
                                            onClick={() => setLimitOpen(true)}
                                            sx={{ 
                                                color: 'white', 
                                                borderColor: 'rgba(255,255,255,0.2)',
                                                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' }
                                            }}
                                        >
                                            Limits
                                        </Button>
                                        <Button 
                                            variant="contained" 
                                            startIcon={<NotificationsActive />} 
                                            onClick={() => setNotificationOpen(true)}
                                            sx={{ 
                                                bgcolor: '#00e5ff', 
                                                color: 'black', 
                                                fontWeight: 'bold',
                                                '&:hover': { bgcolor: '#00b2cc' } 
                                            }}
                                        >
                                            Wake Up Students
                                        </Button>
                                    </React.Fragment>
                                )}
                                <Button 
                                    variant="contained" 
                                    startIcon={<Add />} 
                                    onClick={() => setOpen(true)} 
                                    sx={{ 
                                        bgcolor: '#ff0055', 
                                        fontWeight: 'bold',
                                        '&:hover': { bgcolor: '#cc0044' } 
                                    }}
                                >
                                    New Reminder
                                </Button>
                            </Box>
                        </Box>

                        {/* Reminders List */}
                        {reminders.length === 0 ? (
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
                                        <Typography variant="body2" sx={{ color: '#444', mb: 3 }}>
                                            Create your first reminder to get started
                                        </Typography>
                                        <Button 
                                            variant="outlined" 
                                            startIcon={<Add />}
                                            onClick={() => setOpen(true)}
                                            sx={{ 
                                                color: '#ff0055', 
                                                borderColor: '#ff0055',
                                                '&:hover': { borderColor: '#cc0044', bgcolor: 'rgba(255,0,85,0.1)' }
                                            }}
                                        >
                                            Add Reminder
                                        </Button>
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
                                                                    {reminder.time}
                                                                </Typography>
                                                            </Box>
                                                            
                                                            {reminder.forGroup && (
                                                                <Chip 
                                                                    icon={<Group sx={{ fontSize: 16 }} />}
                                                                    label={reminder.forGroup}
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
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Fade>
                                ))}
                            </Box>
                        )}
                    </Box>
                </Container>

                {/* Add Reminder Dialog */}
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

                {/* Push Notification Dialog */}
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

                {/* Limits Dialog */}
                <Dialog 
                    open={limitOpen} 
                    onClose={() => setLimitOpen(false)} 
                    maxWidth="xs"
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
                            <Settings sx={{ color: '#ff0055' }} />
                            <Typography variant="h6" fontWeight="bold">Set User Limits</Typography>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ mb: 2.5, color: '#aaa' }}>
                            Limit the number of reminders a student can set.
                        </Typography>
                        <TextField
                            type="number"
                            label="Max Reminders"
                            fullWidth
                            variant="outlined"
                            value={reminderLimit}
                            onChange={(e) => setReminderLimit(Number(e.target.value))}
                            inputProps={{ min: 1, max: 20 }}
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
                        <Button onClick={() => setLimitOpen(false)} sx={{ color: '#888' }}>Cancel</Button>
                        <Button 
                            onClick={handleSaveLimit} 
                            variant="contained"
                            sx={{ 
                                bgcolor: '#ff0055',
                                fontWeight: 'bold',
                                '&:hover': { bgcolor: '#cc0044' }
                            }}
                        >
                            Save Limit
                        </Button>
                    </DialogActions>
                </Dialog>

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