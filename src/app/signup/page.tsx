'use client'
import React, { useState } from 'react'
import { Box, Button, TextField, Typography, Alert, MenuItem, InputAdornment, IconButton, Divider, CircularProgress } from '@mui/material'
import { signup, signInWithGoogle } from '@/app/auth/actions'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import GoogleIcon from '@mui/icons-material/Google'
import Link from 'next/link'

const SignupPage = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const result = await signup(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
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
        <Box sx={{ 
            p: 4, 
            bgcolor: 'var(--surface)', 
            borderRadius: 2, 
            width: '100%', 
            maxWidth: 400,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
        }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: 'var(--primary)' }}>
            Account Created!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'var(--text-secondary)' }}>
            Please check your email to confirm your account before logging in.
          </Typography>
          <Button 
            component={Link}
            href="/login"
            variant="contained" 
            fullWidth 
            size="large"
            sx={{ bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary)', filter: 'brightness(0.8)' } }}
          >
            Go to Login
          </Button>
        </Box>
      </Box>
    )
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
            Join <span style={{ color: 'var(--primary)' }}>D4NCE</span>
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
          {googleLoading ? 'Connecting...' : 'Sign up with Google'}
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
            name="fullName"
            label="Full Name"
            fullWidth
            margin="normal"
            slotProps={{
              htmlInput:{
                form: {
                    autocomplete: 'off',  
                },
              }
            }}
            required
        />

        <TextField
            name="email"
            label="Email"
            type="email"
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
            required
        />

        <TextField
            name="role"
            select
            label="I am a..."
            fullWidth
            margin="normal"
            defaultValue="student"
            slotProps={{
              htmlInput:{
                form: {
                    autocomplete: 'off',  
                },
              }
            }}
        >
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="admin">Instructor (Admin)</MenuItem>
        </TextField>

        <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            size="large"
            disabled={loading}
            sx={{ mt: 3, bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary)', filter: 'brightness(0.8)' } }}
        >
            {loading ? 'Creating Account...' : 'Sign Up'}
        </Button>
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                Already have an account? <Link href="/login" style={{ color: 'var(--primary)' }}>Log in</Link>
            </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default SignupPage
