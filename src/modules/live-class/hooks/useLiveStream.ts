import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Dynamically import PeerJS to avoid SSR issues
let Peer: any;
if (typeof window !== 'undefined') {
  import('peerjs').then((module) => {
    Peer = module.default;
  });
}

export const useLiveStream = (role: 'admin' | 'student', channelName: string = 'room-1') => {
  const [peerId, setPeerId] = useState<string>('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const peerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      if (!Peer) {
        const module = await import('peerjs');
        Peer = module.default;
      }

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

      const call = peerRef.current.call(adminPeerId, new MediaStream()); // Send empty stream or nothing
      // Actually, for one-way viewing, we just want to receive.
      // But PeerJS requires a stream to answer usually? No, answer(stream) is enough.
      // The caller doesn't need to send a stream.

      // Wait, if I call without stream, the other side answers with stream.
      // peer.call(id, stream) -> stream is optional? No, it's required in TS usually.
      // Let's pass a dummy stream or null if allowed.
      // Actually, let's just pass a dummy audio track if needed, or check docs.
      // Standard WebRTC allows offer to receive only.
      // PeerJS `call` signature: call(peer, stream, [options]).
      // We can pass a dummy stream.

      // For now, let's just pass a dummy stream to satisfy the API, or maybe undefined works.
      // Let's create a dummy stream.
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
