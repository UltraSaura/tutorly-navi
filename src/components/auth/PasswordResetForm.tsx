import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail } from 'lucide-react';

const passwordResetSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

interface PasswordResetFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
  loading?: boolean;
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ 
  onSubmit, 
  onBack, 
  loading = false 
}) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema)
  });

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <div className="bg-primary/10 p-3 rounded-full">
            <Mail className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-center">{t('auth.resetPassword')}</CardTitle>
        <CardDescription className="text-center">
          {t('auth.resetPasswordDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => onSubmit(data.email))} className="space-y-4">
          <div>
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              {...register('email')}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('auth.sendResetLink')}
          </Button>

          <Button 
            type="button" 
            variant="ghost" 
            onClick={onBack} 
            className="w-full"
            disabled={loading}
          >
            {t('auth.backToLogin')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

