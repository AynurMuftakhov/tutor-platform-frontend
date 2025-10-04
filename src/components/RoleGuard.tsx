import React from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  allow: 'TEACHER' | 'STUDENT';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleGuard: React.FC<Props> = ({ allow, children, fallback }) => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const allowed = allow === 'TEACHER' ? role === 'tutor' || role === 'teacher' : role === 'student';
  if (!allowed) {
    return <>{fallback ?? <div>Not authorized</div>}</>;
  }
  return <>{children}</>;
};

export default RoleGuard;
