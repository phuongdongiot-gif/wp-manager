import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { Dashboard } from './views/Dashboard';
import { PostsView } from './views/PostsView';
import { PagesView } from './views/PagesView';
import { AppLayout } from './components/layout/AppLayout';
import { Toaster } from 'sonner';
import './App.css';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sites, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#050505]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return sites.length > 0 ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" />;
};

function AppContent() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* We want anyone to access /login to add MORE sites, even if authenticated */}
        <Route path="/login" element={<LoginView />} />
        
        <Route 
          path="/*" 
          element={
            <PrivateRoute>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/posts" element={<PostsView />} />
                <Route path="/pages" element={<PagesView />} />
              </Routes>
            </PrivateRoute>
          } 
        />
      </Routes>
    </>
  );
}

const SplashScreen: React.FC = () => {
  const [show, setShow] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Start exit animation after 2.5s
    const timer = setTimeout(() => {
      setAnimating(true);
    }, 2500);

    // Unmount after 3.2s
    const timer2 = setTimeout(() => {
      setShow(false);
    }, 3200);

    return () => { clearTimeout(timer); clearTimeout(timer2); };
  }, []);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[999] bg-[#050505] flex flex-col items-center justify-center transition-opacity duration-1000 ${animating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white tracking-wider font-semibold uppercase animate-fade-in-up opacity-0 flex items-center">
          WP<span className="text-primary font-bold ml-4">Manager</span>
        </h1>
        {/* Animated Gold Line */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-[1px] bg-primary/20 w-full min-w-[12rem] overflow-hidden">
          <div className="w-full h-full bg-primary origin-left animate-splash-line opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}></div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <SplashScreen />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
