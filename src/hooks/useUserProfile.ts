import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  userType: 'student' | 'parent';
  level: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const userProfile: UserProfile = {
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        email: user.email || '',
        phoneNumber: user.user_metadata?.phone_number || '',
        country: user.user_metadata?.country || '',
        userType: user.user_metadata?.user_type || 'student',
        level: user.user_metadata?.level || ''
      };
      setProfile(userProfile);
    }
    setLoading(false);
  }, [user]);

  return { profile, loading };
}; 