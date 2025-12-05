'use client'
import React, { useState, useEffect } from 'react'
import { Box, Typography, TextField, Button, Chip, Autocomplete, CircularProgress, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, Paper, Grid, FormControlLabel, Switch, IconButton } from '@mui/material'
import { createClient } from '@/lib/supabase/client'
import { Save, Check, Close, Block, Delete, Chat, VideoCall } from '@mui/icons-material'
import { CommunityChat } from './community-chat'
import { ReelsFeed } from '@/modules/reels/components/reels-feed'
import { StartCallDialog } from './start-call-dialog'
import { Tabs, Tab } from '@mui/material'
import { notifyCallInvite } from '@/app/actions/notifications';
import { useRouter } from 'next/navigation'

interface Community {
  id: string
  name: string
  tags: string[]
  join_policy: 'open' | 'approval_required'
}

interface Member {
  id: string
  user_id: string
  joined_at: string
  status: 'pending' | 'approved' | 'rejected'
  profiles: {
    full_name: string
    avatar_url: string
    email: string
  }
}

export const CommunityManagement = () => {
  const router = useRouter()
  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'approval_required'>('open')
  const [viewTab, setViewTab] = useState(0) // 0: Feed, 1: Chat, 2: Settings
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  
  const predefinedTags = ['Education', 'Choreography', 'Performance', 'Competition', 'Social', 'Fitness', 'Hip Hop', 'Ballet', 'Contemporary']
  
  const supabase = createClient()

  useEffect(() => {
    fetchCommunityData()
  }, [])

  const fetchCommunityData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // Fetch community
      const { data: communityData, error } = await supabase
        .from('communities')
        .select('*')
        .eq('admin_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (communityData) {
        setCommunity(communityData)
        setName(communityData.name)
        setDescription(communityData.description || '')
        setTags(communityData.tags || [])
        setJoinPolicy(communityData.join_policy || 'open')

        // Fetch members
        const { data: membersData, error: membersError } = await supabase
          .from('community_members')
          .select(`
            id,
            user_id,
            joined_at,
            status,
            profiles:profiles!community_members_user_id_fkey (
              full_name,
              avatar_url,
              email
            )
          `)
          .eq('community_id', communityData.id)
        
        if (membersData) {
          // @ts-ignore
          setMembers(membersData)
        }
      }
    } catch (error) {
      console.error('Error fetching community data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!community) return
    
    try {
      setSaving(true)
      const { error } = await supabase
        .from('communities')
        .update({ name, description, tags, join_policy: joinPolicy })
        .eq('id', community.id)

      if (error) throw error
      
      alert('Community updated successfully!')
    } catch (error) {
      console.error('Error updating community:', error)
      alert('Failed to update community.')
    } finally {
      setSaving(false)
    }
  }

  const handleStartCall = async (selectedUserIds: string[]) => {
    if (!community || !currentUserId) return

    const roomId = `room-${community.id}-${Date.now()}`
    
    try {
      // 1. Create invites in DB (optional but good for history)
      const invites = selectedUserIds.map(userId => ({
        community_id: community.id,
        caller_id: currentUserId,
        receiver_id: userId,
        room_id: roomId,
        status: 'pending'
      }))

      const { error } = await supabase
        .from('call_invites')
        .insert(invites)

      if (error) throw error

      // 2. Emit Supabase Realtime Event to notify users
      // We need to fetch the caller's name to show in the notification
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).single()
      const callerName = profile?.full_name || 'Instructor'

      // Send to each user's personal channel
      for (const userId of selectedUserIds) {
        const channel = supabase.channel(`user-${userId}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'incoming-call',
              payload: {
                roomId,
                callerId: currentUserId,
                callerName,
                communityName: community.name,
                receiverIds: selectedUserIds
              }
            });
            // Cleanup after a short delay
            setTimeout(() => supabase.removeChannel(channel), 5000);
          }
        });
      }

      // Send Push Notification
      await notifyCallInvite(callerName, community.name, selectedUserIds, roomId);

      // 3. Navigate to the call room immediately
      // We use window.location.href to force a full reload and ensure the state is reset and the tab is switched correctly.
      window.location.href = `/admin?callId=${roomId}&autoJoin=true&tab=live`;
      
    } catch (error) {
      console.error('Error starting call:', error)
      alert('Failed to start call.')
    }
  }

  const handleCreate = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('communities')
        .insert({
          name,
          description,
          tags,
          admin_id: user.id,
          join_policy: 'open'
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setCommunity(data)
        alert('Community created successfully!')
      }
    } catch (error) {
      console.error('Error creating community:', error)
      alert('Failed to create community.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress sx={{ color: '#ff0055' }} />
      </Box>
    )
  }

  if (!community) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Create Your Community</Typography>
        <Typography variant="body1" sx={{ mb: 4, color: '#888', textAlign: 'center', maxWidth: 600 }}>
            It looks like you haven't created a community yet. Set up your community profile to start connecting with students.
        </Typography>

        <Paper sx={{ p: 4, bgcolor: '#1a1a1a', color: 'white', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 600 }}>
            <TextField
              label="Community Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                },
                '& .MuiInputLabel-root': { color: '#888' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />

            <Autocomplete
              multiple
              freeSolo
              options={predefinedTags}
              value={tags}
              onChange={(event, newValue) => setTags(newValue)}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip variant="outlined" label={option} key={key} {...tagProps} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Tags"
                  placeholder="Add tags"
                  margin="normal"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                    },
                    '& .MuiInputLabel-root': { color: '#888' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                  }}
                />
              )}
            />

            <Button 
              variant="contained" 
              fullWidth
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleCreate}
              disabled={saving || !name}
              sx={{ mt: 4, bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}
            >
              Create Community
            </Button>
        </Paper>
      </Box>
    )
  }

  const handleApprove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ status: 'approved' })
        .eq('id', memberId)

      if (!error) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'approved' } : m))
      }
    } catch (error) {
      console.error('Error approving member:', error)
    }
  }

  const handleReject = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('id', memberId)

      if (!error) {
        setMembers(prev => prev.filter(m => m.id !== memberId))
      }
    } catch (error) {
      console.error('Error rejecting member:', error)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    handleReject(memberId)
  }

  const handleBlock = async (memberId: string) => {
    if (!confirm('Are you sure you want to block this member? They will not be able to join again.')) return
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ status: 'rejected' })
        .eq('id', memberId)

      if (!error) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'rejected' } : m))
      }
    } catch (error) {
      console.error('Error blocking member:', error)
    }
  }

  const handleUnblock = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ status: 'approved' })
        .eq('id', memberId)

      if (!error) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'approved' } : m))
      }
    } catch (error) {
      console.error('Error unblocking member:', error)
    }
  }

  const pendingMembers = members.filter(m => m.status === 'pending')
  const approvedMembers = members.filter(m => m.status === 'approved')
  const blockedMembers = members.filter(m => m.status === 'rejected')

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'black', color: 'white' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #ff0055, #ff00aa)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            {community.name}
        </Typography>
        {viewTab === 1 && (
            <Button 
              variant="contained" 
              size="small"
              startIcon={<VideoCall />}
              onClick={() => setCallDialogOpen(true)}
              sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}
            >
              Call
            </Button>
        )}
      </Box>

      <Tabs 
        value={viewTab} 
        onChange={(e, v) => setViewTab(v)}
        sx={{ 
            bgcolor: '#111',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            '& .MuiTab-root': { color: '#888' },
            '& .Mui-selected': { color: '#ff0055' },
            '& .MuiTabs-indicator': { bgcolor: '#ff0055' }
        }}
      >
        <Tab label="Feed" />
        <Tab label="Chat" />
        <Tab label="Manage" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', p: viewTab === 2 ? 3 : 0 }}>
        {viewTab === 0 && (
             // @ts-ignore
            <ReelsFeed communityId={community.id} disableUrlSync={true} />
        )}
        {viewTab === 1 && currentUserId && (
            <Box sx={{ height: '100%', p: 2 }}>
                <CommunityChat communityId={community.id} communityName={community.name} currentUserId={currentUserId} />
            </Box>
        )}
        {viewTab === 2 && (
            <Box sx={{ height: '100%', overflowY: 'auto' }}>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: '#1a1a1a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Settings</Typography>
                        
                        <TextField
                        label="Community Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        margin="normal"
                        sx={{ 
                            '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                            },
                            '& .MuiInputLabel-root': { color: '#888' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                        }}
                        />

                        <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        margin="normal"
                        sx={{ 
                            '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                            },
                            '& .MuiInputLabel-root': { color: '#888' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                        }}
                        />

                        <Autocomplete
                        multiple
                        freeSolo
                        options={predefinedTags}
                        value={tags}
                        onChange={(event, newValue) => setTags(newValue)}
                        renderTags={(value: readonly string[], getTagProps) =>
                            value.map((option: string, index: number) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                                <Chip variant="outlined" label={option} key={key} {...tagProps} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                            );
                            })
                        }
                        renderInput={(params) => (
                            <TextField
                            {...params}
                            variant="outlined"
                            label="Tags"
                            placeholder="Add tags"
                            margin="normal"
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                                },
                                '& .MuiInputLabel-root': { color: '#888' },
                                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                            }}
                            />
                        )}
                        />

                        <FormControlLabel
                        control={
                            <Switch
                            checked={joinPolicy === 'approval_required'}
                            onChange={(e) => setJoinPolicy(e.target.checked ? 'approval_required' : 'open')}
                            
                            />
                        }
                        label="Require Approval to Join"
                        sx={{ mt: 2, color: 'white' }}
                        />
                        <Typography variant="caption" display="block" sx={{ color: '#888', ml: 4, mb: 2 }}>
                            If enabled, users must request to join and wait for your approval.
                        </Typography>

                        <Button 
                        variant="contained" 
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ mt: 2, bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}
                        >
                        Save Changes
                        </Button>
                    </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: '#1a1a1a', color: 'white', border: '1px solid rgba(255,255,255,0.1)', mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Pending Requests ({pendingMembers.length})</Typography>
                        
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {pendingMembers.map((member) => (
                            <React.Fragment key={member.id}>
                            <ListItem 
                                alignItems="flex-start"
                                secondaryAction={
                                    <Box>
                                        <IconButton onClick={() => handleApprove(member.id)} sx={{ color: '#4caf50' }}>
                                            <Check />
                                        </IconButton>
                                        <IconButton onClick={() => handleReject(member.id)} sx={{ color: '#f44336' }}>
                                            <Close />
                                        </IconButton>
                                    </Box>
                                }
                            >
                                <ListItemAvatar>
                                <Avatar alt={member.profiles.full_name} src={member.profiles.avatar_url} />
                                </ListItemAvatar>
                                <ListItemText
                                primary={
                                    <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {member.profiles.full_name}
                                    </Typography>
                                }
                                secondary={
                                    <Typography variant="body2" sx={{ color: '#888' }}>
                                    Requested: {new Date(member.joined_at).toLocaleDateString()}
                                    </Typography>
                                }
                                />
                            </ListItem>
                            <Divider variant="inset" component="li" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            </React.Fragment>
                        ))}
                        {pendingMembers.length === 0 && (
                            <Typography sx={{ color: '#666', textAlign: 'center', py: 2 }}>No pending requests.</Typography>
                        )}
                        </List>
                    </Paper>

                    <Paper sx={{ p: 3, bgcolor: '#1a1a1a', color: 'white', border: '1px solid rgba(255,255,255,0.1)', mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Blocked Members ({blockedMembers.length})</Typography>
                        
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {blockedMembers.map((member) => (
                            <React.Fragment key={member.id}>
                            <ListItem 
                                alignItems="flex-start"
                                secondaryAction={
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        onClick={() => handleUnblock(member.id)}
                                        sx={{ color: '#4caf50', borderColor: '#4caf50' }}
                                    >
                                        Unblock
                                    </Button>
                                }
                            >
                                <ListItemAvatar>
                                <Avatar alt={member.profiles.full_name} src={member.profiles.avatar_url} />
                                </ListItemAvatar>
                                <ListItemText
                                primary={
                                    <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {member.profiles.full_name}
                                    </Typography>
                                }
                                secondary={
                                    <Typography variant="body2" sx={{ color: '#888' }}>
                                    Blocked: {new Date(member.joined_at).toLocaleDateString()}
                                    </Typography>
                                }
                                />
                            </ListItem>
                            <Divider variant="inset" component="li" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            </React.Fragment>
                        ))}
                        {blockedMembers.length === 0 && (
                            <Typography sx={{ color: '#666', textAlign: 'center', py: 2 }}>No blocked members.</Typography>
                        )}
                        </List>
                    </Paper>

                    <Paper sx={{ p: 3, bgcolor: '#1a1a1a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Members ({approvedMembers.length})</Typography>
                        
                        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {approvedMembers.map((member) => (
                            <React.Fragment key={member.id}>
                            <ListItem 
                                alignItems="flex-start"
                                secondaryAction={
                                    <Box>
                                        <IconButton onClick={() => handleRemove(member.id)} sx={{ color: '#f44336' }} title="Remove Member">
                                            <Delete />
                                        </IconButton>
                                        <IconButton onClick={() => handleBlock(member.id)} sx={{ color: '#666' }} title="Block Member">
                                            <Block />
                                        </IconButton>
                                    </Box>
                                }
                            >
                                <ListItemAvatar>
                                <Avatar alt={member.profiles.full_name} src={member.profiles.avatar_url} />
                                </ListItemAvatar>
                                <ListItemText
                                primary={
                                    <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {member.profiles.full_name}
                                    </Typography>
                                }
                                secondary={
                                    <Typography variant="body2" sx={{ color: '#888' }}>
                                    Joined: {new Date(member.joined_at).toLocaleDateString()}
                                    </Typography>
                                }
                                />
                            </ListItem>
                            <Divider variant="inset" component="li" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            </React.Fragment>
                        ))}
                        {approvedMembers.length === 0 && (
                            <Typography sx={{ color: '#666', textAlign: 'center', py: 2 }}>No members yet.</Typography>
                        )}
                        </List>
                    </Paper>
                    </Grid>
                </Grid>
            </Box>
        )}
      </Box>

      {currentUserId && (
        <StartCallDialog 
            open={callDialogOpen}
            onClose={() => setCallDialogOpen(false)}
            communityId={community.id}
            currentUserId={currentUserId}
            onStartCall={handleStartCall}
        />
      )}
    </Box>
  )
}
