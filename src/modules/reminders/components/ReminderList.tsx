'use client'
import React, { useState } from 'react'
import { Box, Typography, List, ListItem, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material'
import { Delete, Add, Alarm } from '@mui/icons-material'

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
        { id: 1, title: 'Hip Hop Advanced Class', time: 'Tomorrow, 10:00 AM', forGroup: 'Advanced' },
        { id: 2, title: 'Salsa Workshop Payment Due', time: 'Friday, 5:00 PM', forGroup: 'All' },
    ]);
    const [open, setOpen] = useState(false);
    const [newReminder, setNewReminder] = useState({ title: '', time: '', forGroup: '' });

    const handleAdd = () => {
        setReminders([...reminders, { id: Date.now(), ...newReminder }]);
        setOpen(false);
        setNewReminder({ title: '', time: '', forGroup: '' });
    }

    const handleDelete = (id: number) => {
        setReminders(reminders.filter(r => r.id !== id));
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, color: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                    {role === 'admin' ? 'Manage Reminders' : 'Your Reminders'}
                </Typography>
                {role === 'admin' && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}>
                        Reminder
                    </Button>
                )}
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
                            role === 'admin' && (
                                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(reminder.id)} sx={{ color: '#666' }}>
                                    <Delete />
                                </IconButton>
                            )
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
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
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
                    <TextField
                        margin="dense"
                        label="Time"
                        fullWidth
                        variant="outlined"
                        value={newReminder.time}
                        onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
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
                     <TextField
                        margin="dense"
                        label="Target Group"
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
        </Box>
    )
}
