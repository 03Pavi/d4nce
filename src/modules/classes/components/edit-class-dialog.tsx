import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, useTheme, useMediaQuery } from '@mui/material'
import { Edit } from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs from 'dayjs'

interface EditClassDialogProps {
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
    editClass: any;
    setEditClass: (cls: any) => void;
}

export const EditClassDialog = ({ open, onClose, onUpdate, editClass, setEditClass }: EditClassDialogProps) => {
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
              <Edit sx={{ color: '#ff0055' }} />
              <Typography variant="h6" fontWeight="bold">Edit Class</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            <TextField
              autoFocus
              label="Class Title *"
              fullWidth
              placeholder="e.g., Advanced Hip Hop"
              value={editClass.title}
              onChange={(e) => setEditClass({ ...editClass, title: e.target.value })}
             
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              placeholder="Describe the class..."
              value={editClass.description}
              onChange={(e) => setEditClass({ ...editClass, description: e.target.value })}
             
            />
            <TextField
              label="Session ID *"
              fullWidth
              placeholder="e.g., advanced-hiphop-01"
              value={editClass.session_id}
              InputProps={{ readOnly: true }} // Make Session ID read-only
              helperText="Unique identifier for live streaming (read-only)"
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price ($)"
                type="number"
                fullWidth
                value={editClass.price}
                onChange={(e) => setEditClass({ ...editClass, price: parseFloat(e.target.value) || 0 })}
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
                value={editClass.max_students}
                onChange={(e) => setEditClass({ ...editClass, max_students: parseInt(e.target.value) || 50 })}
                inputProps={{ min: 1 }}
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
            </Box>
            <DateTimePicker
              label="Scheduled Date & Time"
              value={editClass.scheduled_at}
              onChange={(newValue) => newValue && setEditClass({ ...editClass, scheduled_at: newValue })}
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
              label="Duration (minutes)"
              type="number"
              fullWidth
              value={editClass.duration_minutes}
              onChange={(e) => setEditClass({ ...editClass, duration_minutes: parseInt(e.target.value) || 60 })}
              inputProps={{ min: 15, step: 15 }}
             
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button onClick={onClose} sx={{ color: '#888' }}>Cancel</Button>
            <Button 
              onClick={onUpdate} 
              variant="contained"
              sx={{ 
                bgcolor: '#ff0055',
                fontWeight: 'bold',
              }}
            >
              Update Class
            </Button>
          </DialogActions>
        </Dialog>
    )
}
