import { useAuth } from '@/context/AuthContext';
import { useUserContext } from '@/hooks/useUserContext';

export const useAdminAuth = () => {
  const { user } = useAuth();
  const { userContext } = useUserContext();

  const isAdmin = userContext?.user_type === 'admin';
  const isAuthenticated = !!user;

  return {
    isAdmin,
    isAuthenticated,
    canAccessAdmin: isAuthenticated && isAdmin,
  };
};