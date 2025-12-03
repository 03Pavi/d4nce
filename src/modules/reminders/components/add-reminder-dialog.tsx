import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography } from '@mui/material'
import { Alarm } from '@mui/icons-material'
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';

interface AddReminderDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (title: string, time: Dayjs | null, forGroup: string) => void;
}

export const AddReminderDialog = ({ open, onClose, onAdd }: AddReminderDialogProps) => {
    const [newReminder, setNewReminder] = useState<{ title: string; time: Dayjs | null; forGroup: string }>({ 
        title: '', 
        time: dayjs(), 
        forGroup: '' 
    });

    useEffect(() => {
        if (open) {
            setNewReminder({ title: '', time: dayjs(), forGroup: '' });
        }
    }, [open]);

    const handleAdd = () => {
        console.log('Submitting reminder:', newReminder);
        onAdd(newReminder.title, newReminder.time, newReminder.forGroup);
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
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
                <Button onClick={onClose} sx={{ color: '#888' }}>Cancel</Button>
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
    )
}
