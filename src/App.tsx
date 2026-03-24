import React from 'react';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
