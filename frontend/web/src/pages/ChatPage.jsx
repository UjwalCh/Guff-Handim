import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';
import { useSocket } from '../hooks/useSocket';
import { decryptGroupKey, loadKeys } from '../utils/encryption';
import Sidebar from '../components/Layout/Sidebar';
import ChatList from '../components/Chat/ChatList';
import ChatWindow from '../components/Chat/ChatWindow';
import NewChatModal from '../components/Chat/NewChatModal';
import CreateGroupModal from '../components/Group/CreateGroupModal';
import CallModal from '../components/Call/CallModal';

export default function ChatPage() {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const { callState } = useCallStore();

  // Initialize socket
  useSocket();

  const { chats, setChats, setGroupKey, upsertChat, activeChatId, setActiveChat: storeSetActive } = useChatStore();

  // Load all chats
  const { isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await api.get('/chats');

      // Decrypt group keys
      const keys = loadKeys();
      for (const chat of data.chats) {
        if (chat.isGroup && chat.myEncryptedGroupKey && keys) {
          // Find who sent us the key — use admin's public key
          const admin = chat.members?.find(m => m.ChatMember?.role === 'admin');
          if (admin?.publicKey) {
            const gk = decryptGroupKey(chat.myEncryptedGroupKey, admin.publicKey, keys.secretKey);
            if (gk) setGroupKey(chat.id, gk);
          }
        }
      }

      setChats(data.chats);
      return data.chats;
    },
    staleTime: 30000,
  });

  // Sync URL param → active chat
  useEffect(() => {
    if (!paramId || chats.length === 0) return;
    const found = chats.find(c => c.id === paramId);
    if (found) {
      storeSetActive(found.id);
      setActiveChat(found);
    }
  }, [paramId, chats, storeSetActive]);

  function handleSelectChat(chat) {
    setActiveChat(chat);
    navigate(`/chats/${chat.id}`);
  }

  function handleNewChat(chat) {
    upsertChat(chat);
    setShowNewChat(false);
    setShowNewGroup(false);
    handleSelectChat(chat);
  }

  return (
    <div className="h-full p-2 md:p-4 bg-[linear-gradient(120deg,#0b141a_0%,#0f1f29_45%,#112a35_100%)]">
      <div className="h-full flex overflow-hidden rounded-2xl border border-wa-border/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)] bg-wa-bg">
        <Sidebar />

        {/* Chat list panel */}
        <div className={`w-80 border-r border-wa-border flex-shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'} flex-col`}>
          <ChatList
            onNewChat={() => setShowNewChat(true)}
            onSelectChat={handleSelectChat}
          />

          {/* New Group button */}
          <div className="p-3 border-t border-wa-border">
            <button
              onClick={() => setShowNewGroup(true)}
              className="w-full text-wa-text_dim hover:text-wa-text text-sm flex items-center gap-2 px-3 py-2 hover:bg-wa-hover rounded-lg transition"
            >
              <span>👥</span> New Group
            </button>
          </div>
        </div>

        {/* Chat window panel */}
        <div className={`flex-1 ${!activeChat ? 'hidden md:flex' : 'flex'} flex-col`}>
          {activeChat ? (
            <ChatWindow
              chat={activeChat}
              onBack={() => { setActiveChat(null); navigate('/chats'); }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-wa-text_dim bg-[radial-gradient(circle_at_top_right,rgba(0,168,132,0.16),transparent_32%),linear-gradient(180deg,#111b21,#0f171d)] select-none">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-2xl font-light tracking-wide text-wa-text">Guff Handim</p>
              <p className="text-sm mt-2 text-center max-w-sm leading-6">
                Send and receive end-to-end encrypted messages. Select a chat to start a private conversation.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs bg-wa-panel px-4 py-2 rounded-full border border-wa-border">
                <span>🔒</span> End-to-end encrypted
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onChatCreated={handleNewChat}
        />
      )}
      {showNewGroup && (
        <CreateGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreated={handleNewChat}
        />
      )}
      {callState && <CallModal />}
    </div>
  );
}
