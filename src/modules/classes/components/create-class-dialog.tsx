import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, IconButton, useTheme, useMediaQuery } from '@mui/material'
import { School, Autorenew } from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs from 'dayjs'

interface CreateClassDialogProps {
    open: boolean;
    onClose: () => void;
    onCreate: () => void;
    newClass: any;
    setNewClass: (cls: any) => void;
    generateSessionId: () => string;
}

export const CreateClassDialog = ({ open, onClose, onCreate, newClass, setNewClass, generateSessionId }: CreateClassDialogProps) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Dialog 
          open={open} 
          onClose={onClose}
          maxWidth="sm"
          fullWidth
          fullScreen={fullScreen}
          PaperProps={{ 
            sx: { 
              bgcolor: '#1a1a1a', 
              color: 'white',
              borderRadius: fullScreen ? 0 : 3,
              border: '1px solid rgba(255,255,255,0.1)'
            } 
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <School sx={{ color: '#ff0055' }} />
              <Typography variant="h6" fontWeight="bold">Create New Class</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            <TextField
              autoFocus
              label="Class Title *"
              fullWidth
              placeholder="e.g., Advanced Hip Hop"
              value={newClass.title}
              onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              placeholder="Describe the class..."
              value={newClass.description}
              onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
             
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                label="Session ID *"
                fullWidth
                placeholder="e.g., advanced-hiphop-01"
                value={newClass.session_id}
                onChange={(e) => setNewClass({ ...newClass, session_id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                helperText="Unique identifier for live streaming"
                sx={{ 
                  '& .MuiInputBase-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                  '& .MuiFormHelperText-root': { color: '#666' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                }}
              />
              <IconButton 
                onClick={() => setNewClass({ ...newClass, session_id: generateSessionId() })}
                sx={{ 
                  mt: 1,
                  color: '#00e5ff',
                  border: '1px solid rgba(0,229,255,0.3)',
                  bgcolor: 'rgba(0,229,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(0,229,255,0.2)' }
                }}
              >
                <Autorenew />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price ($)"
                type="number"
                fullWidth
                value={newClass.price}
                onChange={(e) => setNewClass({ ...newClass, price: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
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
              <TextField
                label="Max Students"
                type="number"
                fullWidth
                value={newClass.max_students}
                onChange={(e) => setNewClass({ ...newClass, max_students: parseInt(e.target.value) || 50 })}
                inputProps={{ min: 1 }}
              />
            </Box>
            <DateTimePicker
              label="Scheduled Date & Time"
              value={newClass.scheduled_at}
              onChange={(newValue) => newValue && setNewClass({ ...newClass, scheduled_at: newValue })}
            />
            <TextField
              label="Duration (minutes)"
              type="number"
              fullWidth
              value={newClass.duration_minutes}
              onChange={(e) => setNewClass({ ...newClass, duration_minutes: parseInt(e.target.value) || 60 })}
              inputProps={{ min: 15, step: 15 }}
             
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button onClick={onClose} sx={{ color: '#888' }}>Cancel</Button>
            <Button 
              onClick={onCreate} 
              variant="contained"
              sx={{ 
                bgcolor: '#ff0055',
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#cc0044' }
              }}
            >
              Create Class
            </Button>
          </DialogActions>
        </Dialog>
    )
}
