import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { UserTypeSelection } from '@/components/auth/UserTypeSelection';
import { StudentRegistrationForm } from '@/components/auth/StudentRegistrationForm';
import { ParentRegistrationForm } from '@/components/auth/ParentRegistrationForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { CreateChildrenAfterConfirmation } from '@/components/auth/CreateChildrenAfterConfirmation';
import { Button } from '@/components/ui/button';
import { UserType, StudentRegistrationData, ParentRegistrationData } from '@/types/registration';
import { getPhoneAreaCode } from '@/utils/phoneAreaCodes';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type AuthStep = 'login' | 'userType' | 'studentForm' | 'parentForm';

const AuthPage: React.FC = () => {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const location = useLocation();
  const [step, setStep] = useState<AuthStep>('login');
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);

  const state = location.state as { message?: string; returnTo?: string } | null;

  // Show message if redirected from admin panel
  useEffect(() => {
    if (state?.message) {
      toast({
        title: "Admin Access Required",
        description: state.message,
        variant: "default",
      });
    }
  }, [state?.message, toast]);

  // Redirect if already authenticated
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (user) {
    const returnTo = state?.returnTo || "/";
    
    // Special handling for admin routes
    if (returnTo.startsWith('/admin') || returnTo.startsWith('/management')) {
      if (isAdmin) {
        return <Navigate to={returnTo} replace />;
      } else {
        // Non-admin user trying to access admin - show error and option to switch accounts
        return (
          <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6 text-center">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-destructive">{t('auth.adminAccessRequired')}</h1>
                <p className="text-muted-foreground">
                  {t('auth.adminAccessMessage')}
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  variant="destructive" 
                  onClick={async () => {
                    await signOut();
                    window.location.reload();
                  }}
                  className="w-full"
                >
                  {t('auth.signOutAndSwitch')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  {t('auth.backToHome')}
                </Button>
              </div>
            </div>
          </div>
        );
      }
    }
    
    // Regular redirect for non-admin routes
    return <Navigate to={returnTo} replace />;
  }

  const handleLogin = async (data: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        toast({
          title: t('auth.loginError'),
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('auth.loginError'),
        description: t('auth.genericError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserTypeSelect = (userType: UserType) => {
    setSelectedUserType(userType);
    setStep(userType === 'student' ? 'studentForm' : 'parentForm');
  };

  const handleStudentRegistration = async (data: StudentRegistrationData) => {
    setLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, {
        user_type: 'student',
        first_name: data.firstName,
        last_name: data.lastName,
        country: data.country,
        phone_number: data.phoneNumber,
        level: data.schoolLevel,
      });

      if (error) {
        toast({
          title: t('auth.registrationError'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.registrationSuccess'),
          description: t('auth.checkEmail'),
        });
        setStep('login');
      }
    } catch (error) {
      toast({
        title: t('auth.registrationError'),
        description: t('auth.genericError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParentRegistration = async (data: ParentRegistrationData) => {
    setLoading(true);
    try {
      // Format phone number with area code
      const areaCode = getPhoneAreaCode(data.country);
      const fullPhoneNumber = areaCode ? `${areaCode}${data.phoneNumber}` : data.phoneNumber;
      
      // Step 1: Register the guardian with email authentication
      const { error: signUpError, data: authData } = await signUp(data.email, data.password, {
        user_type: 'parent',
        first_name: data.firstName,
        last_name: data.lastName,
        country: data.country,
        phone_number: fullPhoneNumber,
      });

      if (signUpError) {
        toast({
          title: t('auth.registrationError'),
          description: signUpError.message,
          variant: 'destructive',
        });
        return;
      }

      // Step 2: Wait for email confirmation
      toast({
        title: t('auth.registrationSuccess'),
        description: t('auth.checkEmailParent'),
      });
      
      // Step 3: Create child accounts (will happen after email confirmation via separate flow)
      // Store children data temporarily in localStorage for post-confirmation creation
      if (data.children && data.children.length > 0) {
        localStorage.setItem('pending_children', JSON.stringify({
          children: data.children,
          sharedPassword: data.sharedChildPassword,
          guardianEmail: data.email
        }));
      }
      
      setStep('login');
    } catch (error) {
      toast({
        title: t('auth.registrationError'),
        description: t('auth.genericError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Run child creation component if user is authenticated and there are pending children */}
      <CreateChildrenAfterConfirmation />
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
        {step === 'login' && (
          <div className="space-y-6">
            <LoginForm onSubmit={handleLogin} loading={loading} />
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                {t('auth.noAccount')}
              </p>
              <Button variant="outline" onClick={() => setStep('userType')}>
                {t('auth.createAccount')}
              </Button>
            </div>
          </div>
        )}

        {step === 'userType' && (
          <div className="space-y-6">
            <UserTypeSelection onSelect={handleUserTypeSelect} />
            <div className="text-center">
              <Button variant="outline" onClick={() => setStep('login')}>
                {t('auth.backToLogin')}
              </Button>
            </div>
          </div>
        )}

        {step === 'studentForm' && (
          <StudentRegistrationForm
            onSubmit={handleStudentRegistration}
            onBack={() => setStep('userType')}
            loading={loading}
          />
        )}

        {step === 'parentForm' && (
          <ParentRegistrationForm
            onSubmit={handleParentRegistration}
            onBack={() => setStep('userType')}
            loading={loading}
          />
        )}
      </div>
    </div>
    </>
  );
};

export default AuthPage;