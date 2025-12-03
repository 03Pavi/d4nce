'use client'
import React, { useState, useEffect } from 'react'
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
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material'
import { Close, CloudUpload, Delete } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface EditProfileDialogProps {
  open: boolean
  onClose: () => void
  onUpdateSuccess: () => void
  currentProfile: any
}

export const EditProfileDialog = ({ open, onClose, onUpdateSuccess, currentProfile }: EditProfileDialogProps) => {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const supabase = createClient()

  useEffect(() => {
    if (currentProfile) {
      setFullName(currentProfile.full_name || '')
      setUsername(currentProfile.username || '')
      setAvatarPreview(currentProfile.avatar_url)
    }
  }, [currentProfile, open])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0]
      if (selectedFile.type.startsWith('image/')) {
        setAvatarFile(selectedFile)
        setAvatarPreview(URL.createObjectURL(selectedFile))
      } else {
        setError('Please select a valid image file.')
      }
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      let avatarUrl = currentProfile.avatar_url

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        // Try to upload to 'avatars' bucket
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (uploadError) {
            // If avatars bucket doesn't exist, maybe try 'public' or just fail gracefully
            throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        
        avatarUrl = publicUrl
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      onUpdateSuccess()
      onClose()
    } catch (err: any) {
      console.error('Update failed:', err)
      
      let errorMessage = err.message || 'Failed to update profile.'
      
      if (errorMessage.includes('Bucket not found')) {
          errorMessage = "Storage bucket 'avatars' not found. Please run the setup SQL in Supabase."
      } else if (errorMessage.includes('duplicate key value violates unique constraint "profiles_username_idx"')) {
          errorMessage = "This username is already taken. Please choose another one."
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined} 
      fullWidth 
      maxWidth="sm"
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: 'white',
          borderRadius: fullScreen ? 0 : 3,
          border: '1px solid #333'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <Typography variant="h6" fontWeight="bold">Edit Profile</Typography>
        {!loading && (
          <IconButton onClick={onClose} sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'white' } }}>
            <Close />
          </IconButton>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
          
          {/* Avatar Upload */}
          <Box sx={{ position: 'relative' }}>
            <Avatar 
              src={avatarPreview || undefined} 
              sx={{ width: 100, height: 100, border: '2px solid var(--primary)' }}
            />
            <IconButton
              component="label"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'var(--primary)',
                color: 'white',
                '&:hover': { bgcolor: '#d40047' },
                p: 1
              }}
            >
              <CloudUpload fontSize="small" />
              <input type="file" hidden accept="image/*" onChange={handleFileSelect} />
            </IconButton>
          </Box>

          <TextField
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
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

          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            variant="outlined"
            InputProps={{
              startAdornment: <Typography sx={{ color: 'var(--text-secondary)', mr: 0.5 }}>@</Typography>
            }}
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

          {error && (
            <Typography color="error" variant="body2">{error}</Typography>
          )}

        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'var(--text-secondary)' }}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ bgcolor: 'var(--primary)', '&:hover': { bgcolor: '#d40047' } }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
