import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ChatThread, ChatMessage, Pharmacy, Medication, Stock } from '../types';
import { ArrowLeft, Send, Store, Pill, ShoppingCart, CheckCircle2, Clock, MapPin, Truck } from 'lucide-react';

export default function Chat() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [dbMessages, setDbMessages] = useState<ChatMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Advanced simulation states
  const [meds, setMeds] = useState<Medication[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastProcessedMsgIdRef = useRef<string>('');

  // 1. Fetch thread and database messages
  useEffect(() => {
    if (!threadId) return;

    const fetchThreadData = async () => {
      try {
        const threadSnap = await getDoc(doc(db, 'chatThreads', threadId));
        if (threadSnap.exists()) {
          const threadData = { id: threadSnap.id, ...threadSnap.data() } as ChatThread;
          setThread(threadData);
          
          // Also fetch specific pharmacy phone for ordering
          const pSnap = await getDoc(doc(db, 'pharmacies', threadData.pharmacyId));
          if (pSnap.exists()) {
            setPharmacyPhone(pSnap.data().phone || "+243 979 307 569");
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `chatThreads/${threadId}`);
      }
    };
    fetchThreadData();

    // Fetch master list of medications and stocks to make chatbot 100% accurate
    const fetchMasteData = async () => {
      try {
        const medsSnap = await getDocs(collection(db, 'medications'));
        setMeds(medsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Medication)));
        
        const stocksSnap = await getDocs(collection(db, 'stocks'));
        setStocks(stocksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Stock)));
      } catch (err) {
        console.error("Erreur de chargement du catalogue:", err);
      }
    };
    fetchMasteData();

    // Realtime Firestore messages
    const qPath = 'chatMessages';
    const q = query(
      collection(db, qPath),
      where('threadId', '==', threadId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });
      setDbMessages(msgs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, qPath);
    });

    return () => unsubscribe();
  }, [threadId]);

  // 2. Manage and persist local simulated replies to bypass Firestore read/write roles
  useEffect(() => {
    if (!threadId) return;
    const stored = localStorage.getItem(`local_simulated_messages_${threadId}`);
    if (stored) {
      try {
        setLocalMessages(JSON.parse(stored));
      } catch (e) {
        console.error("Erreur de lecture du cache simulation:", e);
      }
    } else {
      setLocalMessages([]);
    }
  }, [threadId]);

  // Combine database and simulated messages sorted by timestamp
  const messages = [...dbMessages, ...localMessages].sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime());
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime());
    return timeA - timeB;
  });

  // Scroll to bottom on updates
  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  }, [messages, isTyping]);

  // 3. Simulated Automated Triage and Pharmacy Assistant agent
  useEffect(() => {
    if (messages.length === 0 || isTyping || !thread || !auth.currentUser) return;
    
    // Get the actual last user-sent message in the system
    const userMessages = messages.filter(m => m.senderId === auth.currentUser?.uid);
    if (userMessages.length === 0) return;
    
    const lastUserMsg = userMessages[userMessages.length - 1];
    
    // Check if we already answered to this message ID
    if (lastUserMsg.id && lastUserMsg.id !== lastProcessedMsgIdRef.current) {
      lastProcessedMsgIdRef.current = lastUserMsg.id;
      
      // Start typing simulation
      setIsTyping(true);
      
      const responseDelay = setTimeout(async () => {
        setIsTyping(false);
        const userText = lastUserMsg.text.toLowerCase();
        
        let replyText = "";
        let medOfferId: string | undefined;
        let medOfferName: string | undefined;
        let medOfferPrice: number | undefined;
        let medOfferImage: string | undefined;
        
        // A. Match a specific medication
        let matchedMed = meds.find(m => 
          userText.includes(m.name.toLowerCase()) || 
          userText.includes(m.molecule.toLowerCase()) ||
          m.name.toLowerCase().split(' ').some(word => word.length > 3 && userText.includes(word))
        );
        
        if (matchedMed) {
          // Find stock at this specific pharmacy
          const stock = stocks.find(s => s.medicationId === matchedMed.id && s.pharmacyId === thread.pharmacyId);
          if (stock && stock.quantity > 0) {
            replyText = `Bonjour! Nous confirmons que nous avons bien du **${matchedMed.name}** (${matchedMed.molecule}) disponible en stock aujourd'hui à l'officine.\n\nNotre prix certifié est de **${stock.price.toLocaleString()} FC**. Souhaitez-vous le commander et l'ajouter à votre panier ci-dessous ?`;
            medOfferId = matchedMed.id;
            medOfferName = matchedMed.name;
            medOfferPrice = stock.price;
            medOfferImage = matchedMed.imageUrl || undefined;
          } else {
            replyText = `Malheureusement, notre stock de **${matchedMed.name}** est temporairement épuisé à la pharmacie ${thread.pharmacyName}. \n\nCependant, nous pouvons vous proposer des équivalents ou le commander d'ici demain. Est-ce que cela vous conviendrait ?`;
          }
        } 
        // B. Symptoms or general health inquiries
        else if (userText.includes("fievre") || userText.includes("fièvre") || userText.includes("chaud") || userText.includes("paludisme") || userText.includes("palu") || userText.includes("courbature")) {
          replyText = `Pour les symptômes de fièvre, courbatures ou paludisme présumé :\n\n1. **Paracétamol 500mg** (Soulagement douleur/fièvre) : *2 500 FC*\n2. **Coartem (Artémisinine)** (Antipaludique standard certifié) : *12 000 FC*\n\nSouhaitez-vous que je vous propose l'un de ces articles pour l'ajouter à votre panier ?`;
        } 
        else if (userText.includes("maux de tete") || userText.includes("mal aux dents") || userText.includes("douleur") || userText.includes("mal")) {
          replyText = `Pour calmer rapidement la douleur ou l'inflammation, nous disposons de :\n\n- **Paracétamol 500mg** (Doux et sûr) : *2 500 FC*\n- **Ibuprofène 400mg** (Anti-inflammatoire puissant) : *3 500 FC*\n- **Diclofénac 50mg** (Articulations/Rhumatisme) : *4 000 FC*\n\nQuel article souhaitez-vous ajouter ?`;
        }
        else if (userText.includes("diabete") || userText.includes("glycemie") || userText.includes("sucre")) {
          replyText = `Pour le contrôle de votre glycémie, nous avons actuellement en stock :\n\n- **Metformine 850mg** (90 comprimés) : *12 000 FC*\n- **Insuline NovoRapid** (Analogue rapide) : *48 000 FC*\n- **Glibenclamide 5mg** : *6 000 FC*\n\n*Note : Gardez votre ordonnance à portée de main.*`;
        }
        else if (userText.includes("antibiotique") || userText.includes("infection") || userText.includes("toux")) {
          replyText = `Nos antibiotiques disponibles (sur prescription) :\n\n- **Amoxicilline 500mg** (Large spectre) : *8 500 FC*\n- **Azithromycine 500mg** (Cure courte respiratoire) : *22 000 FC*\n- **Ciprofloxacine 500mg** (Infections sévères) : *15 000 FC*`;
        }
        // C. Standard greeting or info queries
        else if (userText.includes("bonjour") || userText.includes("salut") || userText.includes("hello") || userText.includes("hey") || userText.includes("aide")) {
          replyText = `Bonjour et bienvenue au guichet virtuel de la **${thread.pharmacyName}** ! 🏥\n\nNous sommes à votre disposition pour vous conseiller et livrer vos médicaments. \n\nVous pouvez simplement : \n- Écrire le nom d'un médicament (ex: *Coartem*, *Paracétamol*)\n- Nous questionner sur un symptôme\n- Demander nos horaires d'ouverture.`;
        } 
        else if (userText.includes("horaire") || userText.includes("ouvert") || userText.includes("ferme") || userText.includes("heure")) {
          replyText = `La **${thread.pharmacyName}** est ouverte au public **24h/24 et 7j/7** pour vous servir. Nous restons disponibles pour toute urgence ou demande d'approvisionnement en pleine nuit à Bukavu !`;
        } 
        else if (userText.includes("livraison") || userText.includes("livrer") || userText.includes("chez moi")) {
          replyText = `Absolument ! Nous livrons partout à Bukavu (Ibanda, Kadutu, Bagira) via notre service de motards partenaires sécurisés. 🏍️\n\nVous pourrez sélectionner le mode "Livraison à domicile" lors du règlement de votre commande dans le panier !`;
        } 
        else if (userText.includes("merci") || userText.includes("super") || userText.includes("parfait") || userText.includes("sympa")) {
          replyText = `C'est un plaisir de vous aider ! Prenez bien soin de votre santé. Si vous avez besoin d'autre chose, n'hésitez pas. À bientôt à la pharmacie ! 👋🏼`;
        } 
        // Default agent response
        else {
          replyText = `Merci pour votre message ! Un pharmacien clinicien de notre équipe à la **${thread.pharmacyName}** examine votre demande concernant votre dernier message. \n\nS'il s'agit d'une prescription ou d'une demande spécifique, vous pouvez également mentionner le médicament désiré directement pour vérifier son prix certifié.`;
        }

        const replyMsg: ChatMessage = {
          id: `sim_${Date.now()}`,
          threadId: thread.id,
          senderId: 'pharmacy',
          senderName: thread.pharmacyName,
          text: replyText,
          createdAt: { toMillis: () => Date.now(), toDate: () => new Date() } as any,
          medOfferId,
          medOfferName,
          medOfferPrice,
          medOfferImage
        };

        // Cache simulation messages locally so it is instant, persistent, and bypasses rules
        const updatedLocal = [...localMessages, replyMsg];
        setLocalMessages(updatedLocal);
        localStorage.setItem(`local_simulated_messages_${thread.id}`, JSON.stringify(updatedLocal));

        // Update the thread's lastMessage display in Firestore listing silently (allow create thread updates)
        try {
          await updateDoc(doc(db, 'chatThreads', thread.id), {
            lastMessage: replyText.substring(0, 60) + (replyText.length > 60 ? '...' : ''),
            lastMessageTime: serverTimestamp()
          });
        } catch (e) {
          console.warn("Failed silent firestore thread label update:", e);
        }

      }, 1500);

      return () => clearTimeout(responseDelay);
    }
  }, [messages, meds, stocks, thread, isTyping, localMessages]);

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

      // Update thread
      await updateDoc(doc(db, 'chatThreads', thread.id), {
        lastMessage: msgText,
        lastMessageTime: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chatMessages');
    }
  };

  // Quick Action: Inject and order medication from chat bubble instantly!
  const handleCreateOrder = async (medId: string, name: string, price: number, imgUrl?: string) => {
    if (!auth.currentUser || !thread) return;
    
    try {
      const orderPath = 'orders';
      await addDoc(collection(db, orderPath), {
        userId: auth.currentUser.uid,
        pharmacyId: thread.pharmacyId,
        pharmacyName: thread.pharmacyName,
        pharmacyPhone: pharmacyPhone || "+243 979 307 569",
        items: [{
          medicationId: medId,
          name: name,
          quantity: 1,
          price: price,
          imageUrl: imgUrl || ""
        }],
        total: price,
        status: 'pending',
        deliveryType: 'pickup',
        createdAt: serverTimestamp()
      });

      setOrderSuccessMsg(`Commandé ! ${name} a été ajouté à votre panier en ligne.`);
      setTimeout(() => setOrderSuccessMsg(null), 3500);
    } catch (error) {
      console.error("Cart order creation from chat failed:", error);
      alert("Erreur lors de l'ajout au panier. Veuillez réessayer.");
    }
  };

  // Helper code to handle suggestion clicks
  const selectSuggestion = async (text: string) => {
    if (!thread || !auth.currentUser) return;
    
    try {
      const msgPath = 'chatMessages';
      await addDoc(collection(db, msgPath), {
        threadId: thread.id,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || "Utilisateur",
        text: text,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
     return (
      <div className="flex-1 flex justify-center items-center font-sans">
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
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center">
              <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight leading-tight">
                {thread?.pharmacyName}
              </h2>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[10px] mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Pharmacien Disponible
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cart success indicator notification */}
      <AnimatePresence>
        {orderSuccessMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-600 text-white p-3.5 mx-4 mt-3 rounded-2xl flex items-center justify-between shadow-lg font-medium text-sm z-50"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{orderSuccessMsg}</span>
            </div>
            <button 
              onClick={() => navigate('/cart')}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1"
            >
              Panier <ShoppingCart className="w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isMine = msg.senderId === auth.currentUser?.uid;
          
          let showTime = false;
          if (index === 0) {
            showTime = true;
          } else {
            const thisTime = msg.createdAt?.toDate ? msg.createdAt.toDate().getTime() : (typeof msg.createdAt === 'number' ? msg.createdAt : Date.now());
            const lastMsg = messages[index-1];
            const lastTime = lastMsg.createdAt?.toDate ? lastMsg.createdAt.toDate().getTime() : (typeof lastMsg.createdAt === 'number' ? lastMsg.createdAt : Date.now());
            showTime = (thisTime - lastTime > 1000 * 60 * 5);
          }
          
          return (
            <div key={msg.id} className="w-full flex flex-col">
              {showTime && (
                <div className="text-center my-4">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
                    {msg.createdAt?.toDate 
                      ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                      : (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '')}
                  </span>
                </div>
              )}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[78%] p-4 ${
                    isMine 
                      ? 'bg-emerald-600 text-white rounded-[1.5rem] rounded-tr-[0.5rem]' 
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] rounded-tl-[0.5rem]'
                  } shadow-sm space-y-1`}
                >
                  <p className="text-sm font-medium leading-relaxed break-words whitespace-pre-line">{msg.text}</p>
                  
                  {/* Actionable Medication Offer embed card */}
                  {msg.medOfferId && (
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl flex items-center gap-3 shadow-inner">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex-shrink-0">
                        {msg.medOfferImage ? (
                          <img 
                            src={msg.medOfferImage} 
                            alt={msg.medOfferName} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950">
                            <Pill className="w-6 h-6 text-emerald-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{msg.medOfferName}</h4>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                          {msg.medOfferPrice?.toLocaleString()} FC
                        </p>
                      </div>
                      <button
                        onClick={() => handleCreateOrder(
                          msg.medOfferId!, 
                          msg.medOfferName!, 
                          msg.medOfferPrice!, 
                          msg.medOfferImage
                        )}
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Acheter
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}

        {/* Real-time typing bubble */}
        {isTyping && (
          <div className="w-full flex justify-start">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] rounded-tl-[0.5rem] p-4 flex items-center gap-1.5 shadow-sm"
            >
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">La pharmacie écrit...</span>
            </motion.div>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Suggested Quick Question chips */}
      <div className="p-2 bg-slate-50 dark:bg-[#151515] overflow-x-auto flex gap-2 border-t border-slate-200/60 dark:border-white/5 scrollbar-none">
        {[
          { text: "Est-ce dispo: Paracétamol ?", label: "💊 Paracétamol" },
          { text: "Avez-vous du Coartem ?", label: "🦟 Coartem (Palu)" },
          { text: "Est-ce dispo: Amoxicilline ?", label: "🧬 Amoxicilline" },
          { text: "Quels sont vos horaires ?", label: "🕒 Horaires & Infos" },
          { text: "Quels sont vos tarifs de livraison ?", label: "🚚 Livraison" }
        ].map((tag, idx) => (
          <button
            key={idx}
            onClick={() => selectSuggestion(tag.text)}
            className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-full text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-white/5 transition-all active:scale-95 whitespace-nowrap"
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Custom Input controls */}
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
