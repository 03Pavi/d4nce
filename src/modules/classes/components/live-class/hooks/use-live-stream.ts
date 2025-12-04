import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export const useLiveStream = (role: 'admin' | 'student', channelName: string = 'room-1', userName: string = 'User', enabled: boolean = true) => {
  const [peerId, setPeerId] = useState<string>('');
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ user: string, text: string }[]>([]);
  const peerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const connectionsRef = useRef<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let currentPeer: any = null;
    let currentChannel: any = null;
    let localMediaStream: MediaStream | null = null;

    const init = async () => {
      if (typeof window === 'undefined') return;

      try {
        try {
          console.log('Requesting local stream...');
          localMediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 }, // Start low for scalability
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
            localMediaStream.getTracks().forEach(track => track.stop());
            return;
          }
          console.log('Local stream obtained');
          setLocalStream(localMediaStream);
        } catch (err) {
          console.error('Failed to get local stream', err);
          // Proceed even if camera fails (receive-only mode?)
          // For now, we'll just log it.
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

        peer.on('open', (id: string) => {
          if (!mounted) return;
          console.log('PeerJS connected with ID:', id);
          setPeerId(id);
          joinChannel(id);
        });

        peer.on('error', (err: any) => {
          console.error('PeerJS error:', err);
        });

        // 3. Handle Incoming Calls (Everyone answers)
        peer.on('call', (call: any) => {
          console.log('Incoming call from ' + call.peer);

          // Answer with local stream (if available)
          call.answer(localMediaStream);

          // Apply bandwidth limit to answer
          const sender = call.peerConnection.getSenders()[0];
          if (sender) {
            // Modern way: setParameters (if supported and easy)
            // Or just rely on constraints. 
            // For 30 users, we rely heavily on low resolution.
          }

          call.on('stream', (stream: MediaStream) => {
            console.log(`Received stream from: ${call.peer}`);
            setRemoteStreams(prev => ({ ...prev, [call.peer]: stream }));
          });

          call.on('close', () => {
            console.log(`Call with ${call.peer} ended`);
            setRemoteStreams(prev => {
              const newStreams = { ...prev };
              delete newStreams[call.peer];
              return newStreams;
            });
            connectionsRef.current.delete(call.peer);
          });

          call.on('error', (err: any) => {
            console.error(`Call error with ${call.peer}:`, err);
          });

          connectionsRef.current.add(call.peer);
        });

      } catch (err) {
        console.error('Failed to initialize:', err);
      }
    };

    const joinChannel = (myPeerId: string) => {
      console.log(`Joining Supabase channel: ${channelName}`);
      const channel = supabase.channel(channelName);
      currentChannel = channel;
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          console.log('Presence sync:', Object.keys(state).length, 'users');

          const allUsers: any[] = [];
          for (const key in state) {
            allUsers.push(...(state[key] as any[]));
          }

          setConnectedCount(allUsers.length);

          // Connect to all other users (Mesh)
          // We use a simple strategy: New joiners call existing users? 
          // Or just call everyone we don't have a connection with.
          // To avoid double-calling, we can compare IDs, but PeerJS usually handles it.
          // Let's just call everyone we aren't connected to.

          allUsers.forEach(user => {
            if (user.peerId && user.peerId !== myPeerId) {
              // Prevent duplicate connections by enforcing ID order
              // Only initiate connection if my ID is "greater" than theirs
              // The other side will receive the call.
              if (!connectionsRef.current.has(user.peerId) && myPeerId > user.peerId) {
                console.log(`Found new peer: ${user.peerId}, connecting...`);
                // Stagger connections slightly to avoid congestion?
                // For now, just connect.
                connectToPeer(user.peerId, localMediaStream);
              }
            }
          });
        })
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
          setChatMessages((prev) => [...prev, payload]);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user: userName,
              role: role,
              peerId: myPeerId,
              onlineAt: new Date().toISOString(),
            });
          }
        });
    };

    const connectToPeer = (targetPeerId: string, streamToShare: MediaStream | null) => {
      if (!peerRef.current || connectionsRef.current.has(targetPeerId)) return;

      console.log(`Calling peer ${targetPeerId}...`);

      // If no local stream, create a dummy one to ensure connection?
      // PeerJS requires a stream for .call() usually, or we use a data connection.
      // But we want video. If we don't have video, we can send a black canvas.
      let stream = streamToShare;
      if (!stream) {
        // Create dummy if needed, similar to before
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1; canvas.height = 1;
          stream = canvas.captureStream(1);
          const track = stream.getVideoTracks()[0];
          // keep it active
        } catch (e) { }
      }

      // We must pass a stream to call() if we want to send one. 
      // If stream is null, we might be receive-only? PeerJS .call(id, stream)
      // If we pass undefined/null, it might fail. Let's assume we have one or create dummy.

      const callObj = peerRef.current.call(targetPeerId, stream);
      connectionsRef.current.add(targetPeerId);

      callObj.on('stream', (remoteStream: MediaStream) => {
        console.log(`Received stream from called peer: ${targetPeerId}`);
        setRemoteStreams(prev => ({ ...prev, [targetPeerId]: remoteStream }));
        setIsConnected(true);
      });

      callObj.on('error', (err: any) => {
        console.error(`Call error with ${targetPeerId}:`, err);
        connectionsRef.current.delete(targetPeerId);
      });

      callObj.on('close', () => {
        console.log(`Call with ${targetPeerId} closed`);
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[targetPeerId];
          return newStreams;
        });
        connectionsRef.current.delete(targetPeerId);
      });
    };

    init();

    return () => {
      mounted = false;
      console.log('Cleaning up useLiveStream...');
      if (currentPeer) currentPeer.destroy();
      if (currentChannel) supabase.removeChannel(currentChannel);
      if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
      }
      // Reset connections and state to ensure fresh start on rejoin
      connectionsRef.current.clear();
      setRemoteStreams({});
      setConnectedCount(0);
      setIsConnected(false);
    };
  }, [role, channelName, userName, enabled]);

  // Aggressive Dynamic Quality Adjustment for Scalability
  useEffect(() => {
    if (!localStream) return;

    const adjustQuality = async () => {
      const videoTrack = localStream.getVideoTracks()[0];
      if (!videoTrack) return;

      let constraints: MediaTrackConstraints = {};

      // For 30 users, we need VERY low bitrate per stream.
      // 30 users * 50kbps = 1.5Mbps upload. Feasible.
      // Resolution must be small.

      if (connectedCount <= 2) {
        constraints = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } };
      } else if (connectedCount <= 6) {
        constraints = { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } };
      } else {
        // > 6 users: Thumbnail quality
        constraints = { width: { ideal: 160 }, height: { ideal: 120 }, frameRate: { ideal: 10 } };
      }

      try {
        await videoTrack.applyConstraints(constraints);
        console.log(`Applied constraints for ${connectedCount} users:`, constraints);
      } catch (e) {
        console.error("Failed to apply constraints:", e);
      }
    };

    adjustQuality();
  }, [connectedCount, localStream]);

  const sendChatMessage = async (text: string) => {
    if (!channelRef.current) return;

    const message = {
      user: userName,
      text
    };

    setChatMessages((prev) => [...prev, message]);

    await channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: message
    });
  };

  const remoteStream = Object.values(remoteStreams)[0] || null;

  return { localStream, remoteStream, remoteStreams, isConnected, chatMessages, sendChatMessage, connectedCount };
};
