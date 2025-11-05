import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Preferencias from './pages/Preferencias';
import AdminUsers from './pages/AdminUsers';
import Transacciones from './pages/Transacciones';
import Generaciones from './pages/Generaciones';
import Publicaciones from './pages/Publicaciones';
import Mensajes from './pages/Mensajes';

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1e2124] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white">Restaurando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            
            {/* Ruta raíz - redirigir a dashboard si está autenticado, sino a login */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Rutas protegidas */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/preferencias" 
              element={
                <ProtectedRoute>
                  <Preferencias />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/transacciones" 
              element={
                <ProtectedRoute>
                  <Transacciones />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/generaciones" 
              element={
                <ProtectedRoute>
                  <Generaciones />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/publicaciones" 
              element={
                <ProtectedRoute>
                  <Publicaciones />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/mensajes" 
              element={
                <ProtectedRoute>
                  <Mensajes />
                </ProtectedRoute>
              } 
            />
            
            {/* Ruta de fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
