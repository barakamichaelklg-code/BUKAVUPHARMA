import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MapView from './components/Map';
import Cart from './components/Cart';
import Auth from './components/Auth';
import ProductDetails from './components/ProductDetails';
import Profile from './components/Profile';

import { ThemeProvider } from './context/ThemeContext';

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
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="map" element={<MapView />} />
              <Route path="product/:id" element={<ProductDetails />} />
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
        </Router>
      )}
    </ThemeProvider>
  );
}
