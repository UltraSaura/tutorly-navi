import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserTypeSelection } from '@/components/auth/UserTypeSelection';
import { StudentRegistrationForm } from '@/components/auth/StudentRegistrationForm';
import { ParentRegistrationForm } from '@/components/auth/ParentRegistrationForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/button';
import { UserType, StudentRegistrationData, ParentRegistrationData } from '@/types/registration';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type AuthStep = 'login' | 'userType' | 'studentForm' | 'parentForm';

const AuthPage: React.FC = () => {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState<AuthStep>('login');
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
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
      // Register the parent
      const { error: signUpError } = await signUp(data.email, data.password, {
        user_type: 'parent',
        first_name: data.firstName,
        last_name: data.lastName,
        phone_number: data.phoneNumber,
      });

      if (signUpError) {
        toast({
          title: t('auth.registrationError'),
          description: signUpError.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: t('auth.registrationSuccess'),
        description: t('auth.checkEmailParent'),
      });
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
  );
};

export default AuthPage;