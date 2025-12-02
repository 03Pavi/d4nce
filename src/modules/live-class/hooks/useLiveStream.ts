import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const useLiveStream = (role: 'admin' | 'student', channelName: string = 'room-1') => {
  const [peerId, setPeerId] = useState<string>('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const peerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      // Only run on client side
      if (typeof window === 'undefined') return;

      try {
        // Dynamically import PeerJS
        const PeerModule = await import('peerjs');
        const Peer = PeerModule.default || PeerModule;

        const myId = uuidv4();
        const peer = new Peer(myId);
        peerRef.current = peer;

        peer.on('open', (id: string) => {
          setPeerId(id);
          joinChannel(id);
        });

        if (role === 'admin') {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            // Answer incoming calls
            peer.on('call', (call: any) => {
              call.answer(stream);
            });
          } catch (err) {
            console.error('Failed to get local stream', err);
          }
        } else {
          // Student: Wait for admin peer ID from presence
        }
      } catch (err) {
        console.error('Failed to initialize PeerJS:', err);
      }
    };

    const joinChannel = (myPeerId: string) => {
      const channel = supabase.channel(channelName);
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          // Check for admin
          for (const key in state) {
            const user = (state[key] as any)[0];
            if (user.role === 'admin' && user.peerId && role === 'student') {
              connectToAdmin(user.peerId);
            }
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user: role === 'admin' ? 'Admin' : 'Student',
              role: role,
              peerId: myPeerId,
            });
          }
        });
    };

    const connectToAdmin = (adminPeerId: string) => {
      if (isConnected || !peerRef.current) return;

      const dummyStream = new MediaStream();
      const callObj = peerRef.current.call(adminPeerId, dummyStream);

      callObj.on('stream', (stream: MediaStream) => {
        setRemoteStream(stream);
        setIsConnected(true);
      });
    };

    init();

    return () => {
      peerRef.current?.destroy();
      channelRef.current?.unsubscribe();
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, [role, channelName]);

  return { localStream, remoteStream, isConnected };
};
