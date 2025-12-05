'use client'
import React, { useState } from 'react'
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
  useTheme,
  useMediaQuery,
  Autocomplete
} from '@mui/material'
import { CloudUpload, Close, Delete, MovieFilter, Groups } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { notifyNewReel } from '@/app/actions/notifications';

interface UploadReelDialogProps {
  open: boolean
  onClose: () => void
  onUploadSuccess: () => void
}

export const UploadReelDialog = ({ open, onClose, onUploadSuccess }: UploadReelDialogProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [communities, setCommunities] = useState<{id: string, name: string}[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<{id: string, name: string} | null>(null)
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const supabase = createClient()

  React.useEffect(() => {
    if (open) {
      fetchCommunities()
    }
  }, [open])

  const fetchCommunities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch communities where user is a member
      const { data: memberData } = await supabase
        .from('community_members')
        .select(`
          community_id,
          communities (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')

      // Fetch communities where user is admin
      const { data: adminData } = await supabase
        .from('communities')
        .select('id, name')
        .eq('admin_id', user.id)

      const memberCommunities = memberData?.map((d: any) => d.communities) || []
      const adminCommunities = adminData || []
      
      // Combine and deduplicate
      const allCommunities = [...adminCommunities, ...memberCommunities].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
      
      setCommunities(allCommunities)
    } catch (error) {
      console.error('Error fetching communities:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0]
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile)
        setPreviewUrl(URL.createObjectURL(selectedFile))
        setError(null)
      } else {
        setError('Please select a valid video file.')
      }
    }
  }

  const handleClearFile = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated');
      
      const userId = user.id;

      // 2. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName)

      // 4. Insert record into database
      const { data: insertedReel, error: dbError } = await supabase
        .from('reels')
        .insert({
          user_id: userId,
          url: publicUrl,
          description: description,
          community_id: selectedCommunity?.id || null,
          likes_count: 0,
          comments_count: 0
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Notify
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      const uploaderName = profile?.full_name || 'Someone';
      await notifyNewReel(uploaderName, insertedReel.id);

      // Success
      onUploadSuccess()
      handleClose()
    } catch (err: any) {
      console.error('Upload failed:', err)
      setError(err.message || 'Failed to upload reel.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewUrl(null)
    setDescription('')
    setSelectedCommunity(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={!uploading ? handleClose : undefined} 
      fullWidth 
      maxWidth="sm"
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: 'white',
          borderRadius: fullScreen ? 0 : 3,
          backgroundImage: 'linear-gradient(to bottom right, #1a1a1a, #2a2a2a)',
          border: '1px solid #333'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MovieFilter sx={{ color: '#ff0055' }} />
          <Typography variant="h6" fontWeight="bold">Upload New Reel</Typography>
        </Box>
        {!uploading && (
          <IconButton onClick={handleClose} sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'white' } }}>
            <Close />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!previewUrl ? (
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ 
                height: 250, 
                border: '2px dashed rgba(255,255,255,0.2)', 
                borderRadius: 2,
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                color: 'var(--text-secondary)',
                bgcolor: 'rgba(255,255,255,0.02)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  border: '2px dashed var(--primary)',
                  bgcolor: 'rgba(255, 0, 85, 0.05)',
                  color: 'var(--primary)'
                }
              }}
            >
              <Box sx={{ 
                p: 2, 
                borderRadius: '50%', 
                bgcolor: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CloudUpload sx={{ fontSize: 40 }} />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>Select Video</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Drag and drop or click to browse</Typography>
              </Box>
              <input
                type="file"
                hidden
                accept="video/*"
                onChange={handleFileSelect}
              />
            </Button>
          ) : (
            <Box sx={{ 
              position: 'relative', 
              width: '100%', 
              height: 350, 
              bgcolor: 'var(--background)', 
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex', 
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <video src={previewUrl} controls style={{ maxHeight: '100%', maxWidth: '100%' }} />
              <IconButton 
                onClick={handleClearFile}
                sx={{ 
                  position: 'absolute', 
                  top: 12, 
                  right: 12, 
                  bgcolor: 'rgba(0,0,0,0.6)', 
                  color: 'white', 
                  backdropFilter: 'blur(4px)',
                  '&:hover': { bgcolor: 'var(--primary)' } 
                }}
              >
                <Delete />
              </IconButton>
            </Box>
          )}

          <TextField
            label="Caption"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            placeholder="Write a catchy caption... #dance #vibes"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.03)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
              },
              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary)' }
            }}
          />

          <Autocomplete
            options={communities}
            getOptionLabel={(option) => option.name}
            value={selectedCommunity}
            onChange={(event, newValue) => setSelectedCommunity(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Post to Community (Optional)"
                placeholder="Select a community or leave empty for Global"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.03)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
                  },
                  '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary)' }
                }}
              />
            )}
            renderOption={(props, option) => (
                <li {...props} style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                    <Groups sx={{ mr: 2, color: '#ff0055' }} />
                    {option.name}
                </li>
            )}
            PaperComponent={({ children }) => (
                <Box sx={{ bgcolor: '#1a1a1a', color: 'white', border: '1px solid #333' }}>
                    {children}
                </Box>
            )}
          />

          {error && (
            <Box sx={{ p: 2, bgcolor: 'rgba(255,0,0,0.1)', borderRadius: 1, border: '1px solid rgba(255,0,0,0.2)' }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Button 
          onClick={handleClose} 
          disabled={uploading}
          sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'white' } }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleUpload} 
          variant="contained" 
          disabled={!file || uploading}
          startIcon={uploading ?  <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
          sx={{
            bgcolor: 'var(--primary)',
            '&:hover': { bgcolor: '#d40047' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.2)', color: 'var(--text-secondary)' },
            px: 4,
            py: 1
          }}
        >
          {uploading ? 'Uploading...' : 'Post Reel'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
