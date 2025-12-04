import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material';

interface SaveRecordingDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (fileName: string) => void;
}

export const SaveRecordingDialog = ({ open, onClose, onSave }: SaveRecordingDialogProps) => {
    const [fileName, setFileName] = useState('');

    const handleSave = () => {
        onSave(fileName.trim() || `recording-${new Date().toISOString()}`);
        setFileName('');
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Save Recording</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Enter a name for your recording. If left blank, a default name will be used.
                </Typography>
                <TextField
                    autoFocus
                    margin="dense"
                    label="File Name"
                    fullWidth
                    variant="outlined"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder={`recording-${new Date().toISOString()}`}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};
