import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export const useLiveStream = (role: 'admin' | 'student', channelName: string = 'room-1', userName: string = 'User', enabled: boolean = true) => {
  const [peerId, setPeerId] = useState<string>('');
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ user: string, text: string }[]>([]);

  const peerRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const connectionsRef = useRef<Set<string>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

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

        // 2. Initialize Socket.IO
        await fetch('/api/socket'); // Ensure socket server is ready (optional if running separate server)
        const socket = io({
          path: '/socket.io', // Default path
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Socket connected:', socket.id);
        });

        // 3. Initialize PeerJS
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

          // Join the room via Socket.IO
          socket.emit('join-room', channelName, id, userName);
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

        // 5. Socket Events
        socket.on('existing-users', (users: { userId: string, userName: string }[]) => {
          console.log('Existing users:', users);
          setConnectedCount(users.length + 1); // +1 for self

          users.forEach(user => {
            connectToPeer(user.userId, streamRef.current);
          });
        });

        socket.on('user-connected', (userId: string, uName: string) => {
          console.log(`User connected: ${userId} (${uName})`);
          setConnectedCount(prev => prev + 1);
          // We don't call them, they call us.
        });

        socket.on('user-disconnected', (userId: string) => {
          console.log(`User disconnected: ${userId}`);
          handlePeerDisconnect(userId);
          setConnectedCount(prev => Math.max(0, prev - 1));
        });

        socket.on('receive-message', (message: { user: string, text: string }) => {
          setChatMessages(prev => [...prev, message]);
        });

      } catch (err) {
        console.error('Failed to initialize:', err);
      }
    };

    const connectToPeer = (targetPeerId: string, stream: MediaStream | null) => {
      if (!peerRef.current || connectionsRef.current.has(targetPeerId)) return;

      console.log(`Calling peer ${targetPeerId}...`);

      if (!stream) {
        console.warn(`⚠️ Attempting to call peer ${targetPeerId} without local stream!`);
      }

      // If no stream, create dummy? PeerJS needs a stream for .call usually?
      // Actually .call(id, stream) - stream is optional in some versions but usually required for video call.
      // If we don't have a stream (e.g. camera denied), we should probably send a dummy track or just data.
      // For now assume stream exists or is null.

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
      connectionsRef.current.delete(peerId);
    };

    init();

    return () => {
      mounted = false;
      console.log('Cleaning up useLiveStream...');
      if (currentPeer) currentPeer.destroy();
      if (socketRef.current) socketRef.current.disconnect();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      connectionsRef.current.clear();
      setRemoteStreams({});
      setConnectedCount(0);
      setIsConnected(false);
    };
  }, [role, channelName, userName, enabled]);

  const sendChatMessage = (text: string) => {
    if (!socketRef.current) return;

    const message = {
      user: userName,
      text
    };

    // Optimistic update? Or wait for server echo?
    // Server echoes to everyone including sender usually, or we can append locally.
    // In server.js I did `io.to(roomId).emit`, which sends to everyone.
    // So we don't need to append locally if we listen to it.
    // But to be responsive, we might want to.
    // However, if we append locally AND listen, we get duplicates.
    // Let's rely on server echo for consistency.

    socketRef.current.emit('send-message', message);
  };

  const remoteStream = Object.values(remoteStreams)[0] || null;

  return { localStream, remoteStream, remoteStreams, isConnected, chatMessages, sendChatMessage, connectedCount };
};
