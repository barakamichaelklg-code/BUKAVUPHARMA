import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Pharmacy, Review } from '../types';
import { ArrowLeft, Star, ShieldCheck, MapPin, MessageSquare, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function PharmacyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Review form state
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });

    if (!id) return;
    
    const fetchPharmacy = async () => {
      try {
        const docRef = doc(db, 'pharmacies', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPharmacy({ id: docSnap.id, ...docSnap.data() } as Pharmacy);
        }
      } catch (err) {
        console.error("Error fetching pharmacy:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacy();

    const q = query(collection(db, 'reviews'), where('pharmacyId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      // Sort by newest first
      reviewData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });
      setReviews(reviewData);
    });

    return () => {
      unsubscribe();
      unsubscribeAuth();
    };
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Vous devez être connecté pour laisser un avis.");
      return;
    }
    
    // Si on veut forcer email vérifié pour "utilisateurs certifiés"
    /*
    if (!user.emailVerified) {
      setError("Seuls les utilisateurs certifiés (email vérifié) peuvent laisser un avis.");
      return;
    }
    */

    if (rating === 0) {
      setError("Veuillez sélectionner une note.");
      return;
    }

    if (!comment.trim()) {
      setError("Veuillez écrire un commentaire.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        pharmacyId: id,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || "Utilisateur Anonyme",
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp()
      });
      
      setRating(0);
      setComment('');
    } catch (err) {
      console.error("Error adding review:", err);
      setError("Une erreur est survenue lors de l'envoi de l'avis.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-4 font-sans">
        <AlertCircle className="w-12 h-12 text-slate-400" />
        <p className="text-slate-500 font-medium text-center">Pharmacie introuvable.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1rem] font-medium transition-all active:scale-95">Retour</button>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "Nouveau";

  return (
    <div className="min-h-screen transition-colors duration-500 font-sans">
      {/* Header */}
      <div className="glass sticky top-0 z-50 p-4 flex items-center gap-4 border-b border-slate-200/60 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[0.8rem] transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight">Pharmacie</h2>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-32">
        
        {/* Pharmacy Details Header */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 dark:border-white/10 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight leading-tight">
                  {pharmacy.name}
                </h1>
                {pharmacy.status === 'certified' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-[1rem] border border-emerald-100/50 dark:border-emerald-500/20">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-widest text-[10px]">Certifiée</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{pharmacy.neighborhood} • {pharmacy.address}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#1A1A1A] px-5 py-3 rounded-[1.5rem] border border-slate-200/60 dark:border-white/5 self-start">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-display leading-none">{averageRating}</p>
                <p className="text-xs text-slate-500 font-semibold">{reviews.length} avis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Avis des patients</h2>
          </div>

          {/* Review Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/60 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Laisser un avis</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-all active:scale-90"
                  >
                    <Star 
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? "text-amber-400 fill-amber-400" 
                          : "text-slate-200 dark:text-slate-700"
                      }`} 
                    />
                  </button>
                ))}
              </div>
              
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience avec cette pharmacie (accueil, disponibilité des médicaments, etc.)"
                className="w-full p-4 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[120px] resize-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
              />

              {error && (
                <div className="text-red-500 text-sm font-semibold bg-red-50 dark:bg-red-900/20 p-4 rounded-[1rem]">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !user}
                  className="px-8 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-[1.5rem] font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                >
                  {submitting ? "Envoi..." : "Publier l'avis"}
                </button>
              </div>
              {!user && (
                <p className="text-xs text-slate-500 text-right mt-2 font-medium">Vous devez être connecté pour publier un avis.</p>
              )}
            </form>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="bg-slate-50 dark:bg-[#1A1A1A] p-8 rounded-[2rem] border border-dashed border-slate-200/60 dark:border-white/10 text-center">
                <Star className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Aucun avis pour le moment. Soyez le premier !</p>
              </div>
            ) : (
              reviews.map((review) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={review.id} 
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/60 dark:border-white/10 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold font-display">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{review.userName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                          {review.createdAt ? new Date(review.createdAt.toDate()).toLocaleDateString('fr-FR') : 'À l\'instant'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-[0.8rem] border border-amber-100 dark:border-amber-500/20">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mr-1" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed pl-[3.25rem]">
                    {review.comment}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
