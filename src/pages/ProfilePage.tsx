import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Globe, GraduationCap, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AccountDeletion from '@/components/profile/AccountDeletion';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';

const ProfilePage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast({ title: t('profile.signedOut') || 'Signed out successfully' });
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({ title: 'Error signing out', variant: 'destructive' });
    } finally {
      setIsSigningOut(false);
    }
  };

  // Mock user data - in real app, fetch from users table
  const userData = {
    firstName: user?.user_metadata?.first_name || 'User',
    lastName: user?.user_metadata?.last_name || '',
    email: user?.email || '',
    phoneNumber: user?.user_metadata?.phone_number || '',
    country: user?.user_metadata?.country || '',
    userType: user?.user_metadata?.user_type || 'student',
    level: user?.user_metadata?.level || ''
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="stuwy-container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('profile.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('profile.description')}
            </p>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('profile.personalInfo')}
              </CardTitle>
              <CardDescription>
                {t('profile.personalInfoDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.firstName')}
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {userData.firstName}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.lastName')}
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {userData.lastName}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('auth.email')}
                </label>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {userData.email}
                </div>
              </div>

              {userData.phoneNumber && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {t('auth.phoneNumber')}
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {userData.phoneNumber}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {t('auth.country')}
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {userData.country}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('profile.accountType')}
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Badge variant={userData.userType === 'parent' ? 'default' : 'secondary'}>
                      {t(`auth.${userData.userType}`)}
                    </Badge>
                  </div>
                </div>
              </div>

              {userData.level && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {t('auth.schoolLevel')}
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {userData.level}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* School Program Settings */}
          <ProfileEditForm />

          {/* Account Deletion */}
          <AccountDeletion />

          {/* Sign Out */}
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full h-12"
          >
            <LogOut className="mr-2 h-5 w-5" />
            {isSigningOut ? 'Signing out...' : (t('nav.signOut') || 'Sign Out')}
          </Button>

          {/* Extra bottom spacing for mobile bottom tabs */}
          <div className="h-20 md:h-0" />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;