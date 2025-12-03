import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export const useLiveStream = (role: 'admin' | 'student', channelName: string = 'room-1') => {
  const [peerId, setPeerId] = useState<string>('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ user: string, text: string }[]>([]);
  const peerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    let currentPeer: any = null;
    let currentChannel: any = null; // This variable is used within the useEffect scope
    let localMediaStream: MediaStream | null = null;

    const init = async () => {
      if (typeof window === 'undefined') return;

      try {
        // 1. If Admin, get media stream FIRST
        if (role === 'admin') {
          try {
            console.log('Requesting local stream...');
            // Start with a balanced quality, will be adjusted dynamically
            localMediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 24 }
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
            return;
          }
        }

        // 2. Initialize PeerJS
        const PeerModule = await import('peerjs');
        const Peer = PeerModule.default || PeerModule;

        const myId = uuidv4();
        console.log(`Initializing PeerJS with ID: ${myId} as ${role}`);

        const peer = new Peer(myId, {
          debug: 2
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

        // 3. Setup Call Handler (Admin only)
        if (role === 'admin' && localMediaStream) {
          peer.on('call', (call: any) => {
            console.log('Incoming call from student ' + call.peer + ', answering...');

            console.log('Sending local stream tracks:');
            localMediaStream?.getTracks().forEach(track => {
              console.log(`Local track: ${track.kind}, enabled: ${track.enabled}, state: ${track.readyState}, label: ${track.label}`);
            });

            call.answer(localMediaStream); // Answer without static bandwidth limit

            call.on('close', () => {
              console.log("Call with student ended");
            });

            call.on('error', (err: any) => {
              console.error("Call error on admin side:", err);
            });
          });
        }

      } catch (err) {
        console.error('Failed to initialize:', err);
      }
    };

    const joinChannel = (myPeerId: string) => {
      console.log(`Joining Supabase channel: ${channelName}`);
      const channel = supabase.channel(channelName);
      currentChannel = channel; // Assign to the `let` variable
      channelRef.current = channel; // Assign to the ref for external access

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          console.log('Presence sync:', JSON.stringify(state, null, 2));

          // Calculate connected students
          let studentCount = 0;
          for (const key in state) {
            const users = state[key] as any[];
            for (const user of users) {
              if (user.role === 'student') {
                studentCount++;
              }
            }
          }
          setConnectedCount(studentCount);

          if (role === 'student') {
            // Find admin
            for (const key in state) {
              const users = state[key] as any[];
              for (const user of users) {
                console.log(`Checking user: ${user.user} (${user.role}) - Peer: ${user.peerId}`);
                if (user.role === 'admin' && user.peerId) {
                  console.log('Found admin:', user.peerId);
                  connectToAdmin(user.peerId);
                }
              }
            }
          }
        })
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
          console.log('Received chat message:', payload);
          setChatMessages((prev) => [...prev, payload]);
        })
        .subscribe(async (status) => {
          console.log('Channel status:', status);
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user: role === 'admin' ? 'Admin' : 'Student',
              role: role,
              peerId: myPeerId,
              onlineAt: new Date().toISOString(),
            });
          }
        });
    };

    const connectToAdmin = (adminPeerId: string) => {
      if (isConnected || !peerRef.current) return;

      console.log(`Connecting to admin ${adminPeerId}...`);

      // Create a dummy stream for receive-only
      // Some browsers require at least one track to establish a connection properly
      const dummyStream = new MediaStream();
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, 1, 1);
        }
        const stream = canvas.captureStream(1);
        const track = stream.getVideoTracks()[0];
        if (track) {
          dummyStream.addTrack(track);
          console.log("Added dummy video track to outgoing call");
        }
      } catch (e) {
        console.error("Failed to create dummy track:", e);
      }

      const callObj = peerRef.current.call(adminPeerId, dummyStream);

      callObj.on('stream', (stream: MediaStream) => {
        console.log('Received remote stream');
        stream.getTracks().forEach(track => {
          console.log(`Remote track: ${track.kind}, enabled: ${track.enabled}, state: ${track.readyState}, label: ${track.label}`);
        });
        setRemoteStream(stream);
        setIsConnected(true);
      });

      callObj.on('error', (err: any) => {
        console.error('Call error:', err);
      });

      callObj.on('close', () => {
        console.log('Call closed');
        setIsConnected(false);
      });
    };

    init();

    return () => {
      mounted = false;
      console.log('Cleaning up useLiveStream...');
      if (currentPeer) currentPeer.destroy();
      if (currentChannel) supabase.removeChannel(currentChannel);

      // Don't stop local stream here if we want to persist it across re-renders? 
      // Actually we should stop it to release camera.
      // But if React Strict Mode runs cleanup immediately, we might lose it.
      // For now, let's stop it.
      // localStream?.getTracks().forEach(track => track.stop());
      // Accessing state inside cleanup is tricky due to closure.
      // Better to use a ref for the stream if we want to clean it up reliably.
      if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [role, channelName]); // Removed supabase from deps to avoid re-running

  // Dynamic Quality Adjustment
  useEffect(() => {
    if (!localStream || role !== 'admin') return;

    const adjustQuality = async () => {
      const videoTrack = localStream.getVideoTracks()[0];
      if (!videoTrack) return;

      let constraints: MediaTrackConstraints = {};

      if (connectedCount <= 3) {
        console.log(`Few users (${connectedCount}), switching to High Quality (1080p)`);
        constraints = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
      } else if (connectedCount <= 8) {
        console.log(`Medium load (${connectedCount}), switching to HD (720p)`);
        constraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } };
      } else {
        console.log(`High load (${connectedCount}), switching to Low Quality (480p)`);
        constraints = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } };
      }

      try {
        await videoTrack.applyConstraints(constraints);
      } catch (e) {
        console.error("Failed to apply constraints:", e);
      }
    };

    adjustQuality();
  }, [connectedCount, localStream, role]);

  // Separate cleanup for local stream when component unmounts
  // This useEffect is no longer needed as cleanup is handled in the main useEffect
  // useEffect(() => {
  //   return () => {
  //     if (localStream) {
  //       localStream.getTracks().forEach(track => track.stop());
  //     }
  //   };
  // }, [localStream]);

  const sendChatMessage = async (text: string) => {
    if (!channelRef.current) return;

    const message = {
      user: role === 'admin' ? 'Instructor' : 'Student',
      text
    };

    // Optimistically add to local state
    setChatMessages((prev) => [...prev, message]);

    await channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: message
    });
  };

  return { localStream, remoteStream, isConnected, chatMessages, sendChatMessage, connectedCount };
};
