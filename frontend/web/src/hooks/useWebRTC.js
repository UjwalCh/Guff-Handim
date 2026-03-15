import { useRef, useCallback } from 'react';
import { getSocket } from './useSocket';
import { useCallStore } from '../store/callStore';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

async function createPeer(options) {
  const simplePeerModule = await import('simple-peer');
  const Peer = simplePeerModule.default;
  return new Peer(options);
}

export function useWebRTC() {
  const peerRef = useRef(null);
  const { setCallActive, setRemoteStream, endCall, setPeer } = useCallStore();
  const socket = getSocket();

  const startCall = useCallback(async (targetUserId, callType = 'voice') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });

    useCallStore.getState().setLocalStream(stream);

    const peer = await createPeer({
      initiator: true,
      trickle: true,
      stream,
      config: { iceServers: ICE_SERVERS },
    });

    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        socket?.emit('webrtc-offer', { targetUserId, offer: data, type: callType });
      } else {
        socket?.emit('webrtc-ice', { targetUserId, candidate: data });
      }
    });

    peer.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
    });

    peer.on('close', () => endCall());
    peer.on('error', (err) => { console.error('Peer error:', err); endCall(); });

    peerRef.current = peer;
    setPeer(peer);
  }, [socket]);

  const answerCall = useCallback(async (offer, targetUserId, callType = 'voice') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });

    useCallStore.getState().setLocalStream(stream);

    const peer = await createPeer({
      initiator: false,
      trickle: true,
      stream,
      config: { iceServers: ICE_SERVERS },
    });

    peer.on('signal', (data) => {
      if (data.type === 'answer') {
        socket?.emit('webrtc-answer', { targetUserId, answer: data });
      } else {
        socket?.emit('webrtc-ice', { targetUserId, candidate: data });
      }
    });

    peer.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
      setCallActive(stream, remoteStream, peer);
    });

    peer.on('close', () => endCall());
    peer.on('error', (err) => { console.error('Peer error:', err); endCall(); });

    peer.signal(offer);
    peerRef.current = peer;
    setPeer(peer);
  }, [socket]);

  const handleAnswer = useCallback((answer) => {
    peerRef.current?.signal(answer);
    setCallActive(
      useCallStore.getState().localStream,
      useCallStore.getState().remoteStream,
      peerRef.current
    );
  }, []);

  const handleIceCandidate = useCallback((candidate) => {
    peerRef.current?.signal(candidate);
  }, []);

  const hangUp = useCallback((targetUserId) => {
    socket?.emit('call-end', { targetUserId });
    endCall();
  }, [socket]);

  return { startCall, answerCall, handleAnswer, handleIceCandidate, hangUp };
}
