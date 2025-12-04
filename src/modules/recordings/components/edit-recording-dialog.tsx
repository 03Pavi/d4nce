import React, { useState, useEffect } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    TextField, 
    Box, 
    Typography, 
    CircularProgress,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';

interface EditRecordingDialogProps {
    open: boolean;
    onClose: () => void;
    onEditSuccess: () => void;
    recording: { id: string, title: string, description: string, class_id?: string | null } | null;
}

export const EditRecordingDialog = ({ open, onClose, onEditSuccess, recording }: EditRecordingDialogProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [classes, setClasses] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const supabase = createClient();

    useEffect(() => {
        const fetchClasses = async () => {
            const { data } = await supabase.from('classes').select('id, title');
            if (data) setClasses(data);
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        if (recording) {
            setTitle(recording.title);
            setDescription(recording.description || '');
            setSelectedClassId(recording.class_id || '');
        }
    }, [recording]);

    const handleSave = async () => {
        if (!recording || !title.trim()) {
            setError('Please provide a title');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const { error: dbError } = await supabase
                .from('recordings')
                .update({
                    title,
                    description,
                    class_id: selectedClassId || null
                })
                .eq('id', recording.id);

            if (dbError) throw dbError;

            onEditSuccess();
            onClose();
        } catch (err: any) {
            console.error('Update error:', err);
            setError(err.message || 'Failed to update recording');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={!saving ? onClose : undefined} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Edit Recording
                {!saving && (
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                )}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                    <TextField
                        label="Title"
                        fullWidth
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={saving}
                    />

                    <FormControl fullWidth disabled={saving}>
                        <InputLabel>Class (Optional)</InputLabel>
                        <Select
                            value={selectedClassId}
                            label="Class (Optional)"
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <MenuItem value="">
                                <em>None (Public)</em>
                            </MenuItem>
                            {classes.map((cls) => (
                                <MenuItem key={cls.id} value={cls.id}>
                                    {cls.title}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Description (Optional)"
                        fullWidth
                        multiline
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={saving}
                    />

                    {error && (
                        <Typography color="error" variant="body2">
                            {error}
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button onClick={onClose} disabled={saving} color="inherit">
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={saving || !title.trim()}
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Edit />}
                    sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
