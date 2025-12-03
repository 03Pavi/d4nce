'use client'
import React, { useState } from 'react'
import { Box, Button, TextField, Typography, Alert } from '@mui/material'
import { login } from '@/app/auth/actions'
import Link from 'next/link'

const LoginPage = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    if(loading) return
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // If success, the action will redirect
  }

  return (
    <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        bgcolor: 'var(--background)',
        color: 'var(--text-primary)',
        p: 2
    }}>
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
            p: 4, 
            bgcolor: 'var(--surface)', 
            borderRadius: 2, 
            width: '100%', 
            maxWidth: 400,
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', textAlign: 'center' }}>
            Login to <span style={{ color: 'var(--primary)' }}>D4NCE</span>
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
            name="email"
            label="Email"
            fullWidth
            margin="normal"
            required
            sx={{
            '& .MuiOutlinedInput-root': {
              color: 'var(--text-primary)',
              bgcolor: 'rgba(255,255,255,0.03)',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
            },
            '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
            '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary)' }
            }}

        />
        <TextField
            name="password"
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            required
            sx={{
            '& .MuiOutlinedInput-root': {
              color: 'var(--text-primary)',
              bgcolor: 'rgba(255,255,255,0.03)',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
            },
            '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
            '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary)' }
            }}
        />

        <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            size="large"
            sx={{ mt: 3, bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary)', filter: 'brightness(0.8)' } }}
        >
            {loading ? 'Signing In...' : 'Sign In'}
        </Button>
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                Don't have an account? <Link href="/signup" style={{ color: 'var(--primary)' }}>Sign up</Link>
            </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default LoginPage
