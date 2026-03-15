import { useEffect, useRef } from 'react';
import { useCallStore } from '../../store/callStore';
import { useWebRTC } from '../../hooks/useWebRTC';
import { getSocket } from '../../hooks/useSocket';
import { getInitials } from '../../utils/helpers';

export default function CallModal() {
  const { callState, callType, remoteUser, localStream, remoteStream, incomingOffer, endCall } = useCallStore();
  const { answerCall, handleAnswer, handleIceCandidate, hangUp } = useWebRTC();
  const localVideoRef  = useRef();
  const remoteVideoRef = useRef();
  const socket = getSocket();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Listen for answer + ICE from socket
  useEffect(() => {
    if (!socket) return;
    socket.on('webrtc-answer', ({ answer }) => handleAnswer(answer));
    socket.on('webrtc-ice',   ({ candidate }) => handleIceCandidate(candidate));
    socket.on('call-end',     () => endCall());
    socket.on('call-rejected', () => endCall());
    return () => {
      socket.off('webrtc-answer');
      socket.off('webrtc-ice');
      socket.off('call-end');
      socket.off('call-rejected');
    };
  }, [socket]);

  if (!callState) return null;

  function reject() {
    socket?.emit('call-reject', { targetUserId: remoteUser?.id });
    endCall();
  }

  const isVideo = callType === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-wa-panel rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
        
        {/* Video streams */}
        {isVideo && callState === 'active' ? (
          <div className="relative h-64 bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video ref={localVideoRef}  autoPlay playsInline muted
              className="absolute bottom-2 right-2 w-20 h-20 object-cover rounded-lg border border-wa-border" />
          </div>
        ) : (
          <div className="h-48 bg-wa-bg flex flex-col items-center justify-center gap-3">
            <div className="w-20 h-20 rounded-full bg-wa-panel flex items-center justify-center text-3xl font-bold text-wa-text">
              {remoteUser?.avatar
                ? <img src={remoteUser.avatar} className="w-full h-full object-cover rounded-full" />
                : getInitials(remoteUser?.name)
              }
            </div>
            <p className="text-wa-text font-semibold">{remoteUser?.name}</p>
            <p className="text-wa-text_dim text-sm">
              {callState === 'incoming' ? `Incoming ${callType} call` :
               callState === 'outgoing' ? 'Calling...' : 'Connected'}
            </p>
          </div>
        )}

        {/* Audio for non-video */}
        {!isVideo && <audio ref={remoteVideoRef} autoPlay />}

        {/* Controls */}
        <div className="flex justify-center gap-8 py-6 bg-wa-panel">
          {callState === 'incoming' ? (
            <>
              <button
                onClick={reject}
                className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl hover:bg-red-600 transition"
                title="Decline"
              >📵</button>
              <button
                onClick={() => answerCall(incomingOffer, remoteUser?.id, callType)}
                className="w-14 h-14 bg-wa-green rounded-full flex items-center justify-center text-white text-2xl hover:bg-green-600 transition"
                title="Answer"
              >{isVideo ? '📹' : '📞'}</button>
            </>
          ) : (
            <button
              onClick={() => hangUp(remoteUser?.id)}
              className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl hover:bg-red-600 transition"
              title="End call"
            >📵</button>
          )}
        </div>
      </div>
    </div>
  );
}
