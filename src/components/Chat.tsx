import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ChatThread, ChatMessage, Pharmacy } from '../types';
import { ArrowLeft, Send, Store } from 'lucide-react';

export default function Chat() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) return;

    const fetchThread = async () => {
      const path = `chatThreads/${threadId}`;
      try {
        const threadSnap = await getDoc(doc(db, 'chatThreads', threadId));
        if (threadSnap.exists()) {
          setThread({ id: threadSnap.id, ...threadSnap.data() } as ChatThread);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    };
    fetchThread();

    const qPath = 'chatMessages';
    const q = query(
      collection(db, qPath),
      where('threadId', '==', threadId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeA - timeB;
      });
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, qPath);
    });

    return () => unsubscribe();
  }, [threadId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !thread || !auth.currentUser) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const msgPath = 'chatMessages';
      // Add message
      await addDoc(collection(db, msgPath), {
        threadId: thread.id,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || "Utilisateur",
        text: msgText,
        createdAt: serverTimestamp()
      });

      const threadPath = `chatThreads/${thread.id}`;
      // Update thread
      await updateDoc(doc(db, 'chatThreads', thread.id), {
        lastMessage: msgText,
        lastMessageTime: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chatMessages');
    }
  };

  if (loading) {
     return (
      <div className="flex-1 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-3xl mx-auto font-sans transition-colors duration-500">
      {/* Header */}
      <div className="glass sticky top-0 z-50 p-4 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[0.8rem] transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight leading-tight">
                {thread?.pharmacyName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">En ligne</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isMine = msg.senderId === auth.currentUser?.uid;
          const showTime = index === 0 || (msg.createdAt?.toMillis() - messages[index-1].createdAt?.toMillis() > 1000 * 60 * 5);
          
          return (
            <div key={msg.id} className="w-full flex flex-col">
              {showTime && (
                <div className="text-center my-4">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
                    {msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </span>
                </div>
              )}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] p-4 ${
                    isMine 
                      ? 'bg-emerald-600 text-white rounded-[1.5rem] rounded-tr-[0.5rem]' 
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] rounded-tl-[0.5rem]'
                  } shadow-sm`}
                >
                  <p className="text-sm font-medium leading-relaxed break-words">{msg.text}</p>
                </div>
              </motion.div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-[#1A1A1A] border-t border-slate-200/60 dark:border-white/5 z-40 pb-24">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 p-2 rounded-[1.5rem]">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 bg-transparent px-4 py-2 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium text-sm"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
