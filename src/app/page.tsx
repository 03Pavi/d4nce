'use client'
import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import Link from 'next/link'
import { motion } from 'framer-motion'

const Page = () => {
  return (
    <Box sx={{ 
        height: '100vh', 
        width: '100vw', 
        bgcolor: 'black', 
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
        px: { xs: 3, md: 0 }
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
          <Typography variant="h2" fontWeight="bold" sx={{ mb: 1, textAlign: 'center', fontSize: { xs: '2.5rem', md: '3.75rem' } }}>
            D4NCE <span style={{ color: '#ff0055' }}>PLATFORM</span>
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, textAlign: 'center', color: '#a0a0a0', fontSize: { xs: '1rem', md: '1.25rem' } }}>
            The ultimate video dance class experience.
          </Typography>
      </motion.div>

      <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Link href="/student">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                    variant="contained" 
                    size="large"
                    sx={{ 
                        bgcolor: '#00e5ff', 
                        color: 'black', 
                        fontWeight: 'bold',
                        px: 4,
                        py: 2,
                        fontSize: '1.2rem',
                        width: { xs: '100%', sm: 'auto' },
                        '&:hover': { bgcolor: '#00b8cc' }
                    }}
                >
                    I'm a Student
                </Button>
            </motion.div>
        </Link>
        
        <Link href="/admin">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                    variant="outlined" 
                    size="large"
                    sx={{ 
                        borderColor: '#ff0055', 
                        color: '#ff0055', 
                        fontWeight: 'bold',
                        px: 4,
                        py: 2,
                        fontSize: '1.2rem',
                        borderWidth: 2,
                        width: { xs: '100%', sm: 'auto' },
                        '&:hover': { borderColor: '#ff0055', bgcolor: 'rgba(255, 0, 85, 0.1)', borderWidth: 2 }
                    }}
                >
                    I'm an Admin
                </Button>
            </motion.div>
        </Link>
      </Box>
    </Box>
  )
}

export default Page