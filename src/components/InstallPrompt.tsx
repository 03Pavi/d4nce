"use client";

import React, { useEffect, useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import { usePWAInstall } from '@/shared/hooks/usePWAInstall';

export const InstallPrompt = () => {
  const { isInstallable, install } = usePWAInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      setOpen(true);
    }
  }, [isInstallable]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleInstall = () => {
    install();
    handleClose();
  };

  if (!isInstallable) return null;

  return (
    <Snackbar 
      open={open} 
      autoHideDuration={10000} 
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={handleClose}
        severity="info"
        sx={{ width: '100%', alignItems: 'center' }}
        action={
          <Button color="inherit" size="small" onClick={handleInstall}>
            INSTALL
          </Button>
        }
      >
        Install COZYTRIBE app for better experience!
      </Alert>
    </Snackbar>
  );
};
