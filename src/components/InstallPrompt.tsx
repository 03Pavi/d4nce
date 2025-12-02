'use client'
import React, { useState, useEffect } from 'react'
import { Box, Button, IconButton, Paper, Typography, Slide } from '@mui/material'
import { Close, GetApp, Apple } from '@mui/icons-material'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA: App is already installed')
      return
    }

    // Check if user dismissed the prompt before
    // const dismissed = localStorage.getItem('pwa-install-dismissed')
    // if (dismissed) {
    //   console.log('PWA: User previously dismissed install prompt')
    //   return
    // }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)
    console.log('PWA: Device type -', iOS ? 'iOS' : 'Android/Desktop')

    if (iOS) {
      // Show iOS install instructions after a delay
      setTimeout(() => {
        console.log('PWA: Showing iOS install prompt')
        setShowPrompt(true)
      }, 1000)
    } else {
      // Listen for beforeinstallprompt event (Android/Desktop)
      const handler = (e: Event) => {
        console.log('PWA: beforeinstallprompt event fired!')
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        setTimeout(() => {
          console.log('PWA: Showing install prompt')
          setShowPrompt(true)
        }, 1000)
      }

      window.addEventListener('beforeinstallprompt', handler)

      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleClose = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <Slide direction="up" in={showPrompt} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: { xs: 70, md: 20 },
          left: { xs: 10, md: 20 },
          right: { xs: 10, md: 'auto' },
          maxWidth: { xs: 'calc(100% - 20px)', md: 400 },
          bgcolor: '#1a1a1a',
          color: 'white',
          p: 2,
          borderRadius: 2,
          border: '1px solid rgba(255,0,85,0.3)',
          zIndex: 9999,
          backdropFilter: 'blur(10px)',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              bgcolor: '#ff0055',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 48,
              height: 48,
            }}
          >
            {isIOS ? <Apple sx={{ fontSize: 28 }} /> : <GetApp sx={{ fontSize: 28 }} />}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
              Install D4NCE App
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa', fontSize: '0.875rem' }}>
              {isIOS
                ? 'Tap the share button and select "Add to Home Screen"'
                : 'Install our app for quick access and offline use'}
            </Typography>

            {!isIOS && (
              <Button
                variant="contained"
                size="small"
                onClick={handleInstallClick}
                sx={{
                  mt: 1.5,
                  bgcolor: '#ff0055',
                  '&:hover': { bgcolor: '#d40047' },
                  textTransform: 'none',
                  fontWeight: 'bold',
                }}
              >
                Install Now
              </Button>
            )}
          </Box>

          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              color: '#666',
              '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    </Slide>
  )
}
