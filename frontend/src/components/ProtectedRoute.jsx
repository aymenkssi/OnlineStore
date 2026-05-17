import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../mock/mockData';

const ProtectedRoute = ({ adminOnly = false }) => {
  const user = getCurrentUser();

  if (!user) {
    // Redirection vers la page d'accueil, l'utilisateur devra cliquer sur l'icône utilisateur pour se connecter
    return <Navigate to="/" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;