'use client'
import React, { useState } from 'react'
import { Box, Button, TextField, Typography, Alert, InputAdornment, IconButton, Divider, CircularProgress } from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import GoogleIcon from '@mui/icons-material/Google'
import { login, signInWithGoogle } from '@/app/auth/actions'
import Link from 'next/link'

const LoginPage = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const result = await signInWithGoogle()
      if (result?.error) {
        setError(result.error)
        setGoogleLoading(false)
      }
    } catch {
      setError('Failed to sign in with Google')
      setGoogleLoading(false)
    }
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

        {/* Google Sign-In Button */}
        <Button
          type="button"
          variant="outlined"
          fullWidth
          size="large"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          startIcon={googleLoading ? <CircularProgress size={20} /> : <GoogleIcon />}
          sx={{ 
            mb: 2,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            color: 'var(--text-primary)',
            '&:hover': { 
              borderColor: 'var(--primary)',
              bgcolor: 'rgba(255, 255, 255, 0.05)'
            },
            textTransform: 'none',
            fontSize: '1rem',
            py: 1.5
          }}
        >
          Continue with Google
        </Button>

        <Divider sx={{ 
          my: 2, 
          color: 'var(--text-secondary)',
          '&::before, &::after': { 
            borderColor: 'rgba(255, 255, 255, 0.2)' 
          }
        }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', px: 1 }}>
            or
          </Typography>
        </Divider>

        <TextField
            name="email"
            label="Email"
            fullWidth
            margin="normal"
            required
        />
        <TextField
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            required
           slotProps={{
            input:{
                endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: 'var(--text-secondary)' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }
           }}
        />

        <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            size="large"
            disabled={loading || googleLoading}
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

