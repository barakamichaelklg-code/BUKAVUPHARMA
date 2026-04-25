import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Layout from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';

const Dashboard = lazy(() => import('./components/Dashboard'));
const MapView = lazy(() => import('./components/Map'));
const Cart = lazy(() => import('./components/Cart'));
const Auth = lazy(() => import('./components/Auth'));
const ProductDetails = lazy(() => import('./components/ProductDetails'));
const PharmacyDetails = lazy(() => import('./components/PharmacyDetails'));
const Profile = lazy(() => import('./components/Profile'));

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center transition-colors duration-300">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Router>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="map" element={<MapView />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route path="pharmacy/:id" element={<PharmacyDetails />} />
                <Route 
                  path="cart" 
                  element={user ? <Cart /> : <Navigate to="/auth" />} 
                />
                <Route 
                  path="profile" 
                  element={user ? <Profile user={user} /> : <Navigate to="/auth" />} 
                />
                <Route path="auth" element={!user ? <Auth /> : <Navigate to="/" />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      )}
    </ThemeProvider>
  );
}
