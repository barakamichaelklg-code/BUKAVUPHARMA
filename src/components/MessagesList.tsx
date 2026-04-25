import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ChatThread } from '../types';
import { MessageSquare, Clock, User, Store } from 'lucide-react';

export default function MessagesList() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/auth');
      return;
    }

    const path = 'chatThreads';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid)
      // Note: we can't easily order by unless we create an index, so we sort in client
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbThreads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatThread));
      dbThreads.sort((a, b) => {
        const timeA = a.lastMessageTime?.toMillis() || 0;
        const timeB = b.lastMessageTime?.toMillis() || 0;
        return timeB - timeA;
      });
      setThreads(dbThreads);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Messages</h2>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200/60 dark:border-white/10 rounded-[2rem] p-12 text-center text-slate-500 flex flex-col items-center">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Aucun message</h3>
          <p className="text-sm font-medium text-slate-500 max-w-sm">
            Vous n'avez pas encore de conversation. Discutez avec nos pharmacies certifiées directement depuis leur page de profil !
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={thread.id}
              onClick={() => navigate(`/chat/${thread.id}`)}
              className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95 flex items-center justify-between"
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {thread.pharmacyName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {thread.lastMessage || "Nouvelle conversation"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0 ml-4">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                  {thread.lastMessageTime ? new Date(thread.lastMessageTime.toDate()).toLocaleDateString() : ''}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
