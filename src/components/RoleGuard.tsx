import React from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  allow: 'TEACHER' | 'STUDENT' | 'ADMIN';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleGuard: React.FC<Props> = ({ allow, children, fallback }) => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  let allowed = false;
  if (allow === 'TEACHER') {
    allowed = role === 'tutor' || role === 'teacher';
  } else if (allow === 'STUDENT') {
    allowed = role === 'student';
  } else if (allow === 'ADMIN') {
    allowed = role === 'admin';
  }
  if (!allowed) {
    return <>{fallback ?? <div>Not authorized</div>}</>;
  }
  return <>{children}</>;
};

export default RoleGuard;
