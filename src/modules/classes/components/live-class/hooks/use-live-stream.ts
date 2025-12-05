import { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useLiveStream = (role: 'admin' | 'student', channelName: string = 'room-1', userName: string = 'User', enabled: boolean = true) => {
  const [peerId, setPeerId] = useState<string>('');
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ user: string, text: string }[]>([]);

  const [remoteUsers, setRemoteUsers] = useState<Record<string, string>>({});

  const peerRef = useRef<any>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectionsRef = useRef<Set<string>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let currentPeer: any = null;

    const init = async () => {
      if (typeof window === 'undefined') return;

      console.log('🎥 Initializing live stream:', { role, channelName, userName, enabled });

      try {
        // 1. Get Local Stream
        try {
          console.log('Requesting local stream...');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              frameRate: { ideal: 15 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });

          if (!mounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          console.log('Local stream obtained');
          setLocalStream(stream);
          streamRef.current = stream;
        } catch (err) {
          console.error('Failed to get local stream', err);
        }

        // 2. Initialize PeerJS
        const PeerModule = await import('peerjs');
        const Peer = PeerModule.default || PeerModule;

        const myId = uuidv4();
        console.log(`Initializing PeerJS with ID: ${myId} as ${role}`);

        const peer = new Peer(myId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });
        currentPeer = peer;
        peerRef.current = peer;

        peer.on('open', async (id: string) => {
          if (!mounted) return;
          console.log('PeerJS connected with ID:', id);
          setPeerId(id);

          // 3. Initialize Supabase Realtime
          const channel = supabase.channel(channelName, {
            config: {
              presence: {
                key: id,
              },
            },
          });
          channelRef.current = channel;

          channel
            .on('presence', { event: 'sync' }, () => {
              const state = channel.presenceState();
              console.log('Presence sync:', state);

              const users: any[] = [];
              const userMap: Record<string, string> = {};

              for (const key in state) {
                if (key !== id) { // Exclude self
                  const userData = state[key][0] as any;
                  users.push(userData);
                  if (userData.peerId && userData.userName) {
                    userMap[userData.peerId] = userData.userName;
                  }
                }
              }

              setConnectedCount(users.length + 1);
              setRemoteUsers(userMap);

              // Connect to existing users
              users.forEach((user: any) => {
                if (user.peerId) {
                  connectToPeer(user.peerId, streamRef.current);
                }
              });
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
              console.log('User joined:', key, newPresences);
              setConnectedCount(prev => prev + 1);
              // Update remote users map
              const userData = newPresences[0] as any;
              if (userData.peerId && userData.userName) {
                setRemoteUsers(prev => ({ ...prev, [userData.peerId]: userData.userName }));
              }
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
              console.log('User left:', key);
              // We might not know the peerId here easily without iterating, but sync usually follows
              // However, we can handle disconnects
              setConnectedCount(prev => Math.max(0, prev - 1));
            })
            .on('broadcast', { event: 'message' }, ({ payload }) => {
              setChatMessages(prev => [...prev, payload]);
            })
            .subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                console.log('Supabase channel subscribed');
                await channel.track({
                  peerId: id,
                  userName
                });
              }
            });
        });

        peer.on('error', (err: any) => {
          console.error('PeerJS error:', err);
        });

        // 4. Handle Incoming Calls
        peer.on('call', (call: any) => {
          console.log('Incoming call from ' + call.peer);

          // Answer with local stream
          call.answer(streamRef.current);

          call.on('stream', (stream: MediaStream) => {
            console.log(`Received stream from: ${call.peer}`);
            setRemoteStreams(prev => ({ ...prev, [call.peer]: stream }));
          });

          call.on('close', () => {
            handlePeerDisconnect(call.peer);
          });

          connectionsRef.current.add(call.peer);
        });

      } catch (err) {
        console.error('Failed to initialize:', err);
      }
    };

    const connectToPeer = (targetPeerId: string, stream: MediaStream | null) => {
      if (!peerRef.current || connectionsRef.current.has(targetPeerId)) return;

      console.log(`Calling peer ${targetPeerId}...`);

      const callObj = peerRef.current.call(targetPeerId, stream);
      connectionsRef.current.add(targetPeerId);

      callObj.on('stream', (remoteStream: MediaStream) => {
        console.log(`Received stream from called peer: ${targetPeerId}`);
        setRemoteStreams(prev => ({ ...prev, [targetPeerId]: remoteStream }));
        setIsConnected(true);
      });

      callObj.on('error', (err: any) => {
        console.error(`Call error with ${targetPeerId}:`, err);
        handlePeerDisconnect(targetPeerId);
      });

      callObj.on('close', () => {
        handlePeerDisconnect(targetPeerId);
      });
    };

    const handlePeerDisconnect = (peerId: string) => {
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[peerId];
        return newStreams;
      });
      setRemoteUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[peerId];
        return newUsers;
      });
      connectionsRef.current.delete(peerId);
    };

    init();

    return () => {
      mounted = false;
      console.log('Cleaning up useLiveStream...');
      if (currentPeer) currentPeer.destroy();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      connectionsRef.current.clear();
      setRemoteStreams({});
      setRemoteUsers({});
      setConnectedCount(0);
      setIsConnected(false);
    };
  }, [role, channelName, userName, enabled]);

  const sendChatMessage = (text: string) => {
    if (!channelRef.current) return;

    const message = {
      user: userName,
      text
    };

    // Send to others
    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: message
    });

    // Add locally
    setChatMessages(prev => [...prev, message]);
  };

  const remoteStream = Object.values(remoteStreams)[0] || null;

  return { localStream, remoteStream, remoteStreams, remoteUsers, isConnected, chatMessages, sendChatMessage, connectedCount };
};
