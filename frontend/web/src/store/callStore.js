import { create } from 'zustand';

export const useCallStore = create((set) => ({
  // incoming or outgoing
  callState: null,  // null | 'incoming' | 'outgoing' | 'active'
  callType: null,   // 'voice' | 'video'
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  peer: null,

  setIncomingCall: (remoteUser, callType, offer) =>
    set({ callState: 'incoming', remoteUser, callType, incomingOffer: offer }),

  setOutgoingCall: (remoteUser, callType) =>
    set({ callState: 'outgoing', remoteUser, callType }),

  setCallActive: (localStream, remoteStream, peer) =>
    set({ callState: 'active', localStream, remoteStream, peer }),

  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setPeer: (peer) => set({ peer }),

  endCall: () => {
    set(s => {
      s.localStream?.getTracks().forEach(t => t.stop());
      s.peer?.destroy();
      return {
        callState: null, callType: null, remoteUser: null,
        localStream: null, remoteStream: null, peer: null, incomingOffer: null,
      };
    });
  },
}));
