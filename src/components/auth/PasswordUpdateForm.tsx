import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type FormData = z.infer<typeof schema>;

export const PasswordUpdateForm: React.FC<{ onSubmit: (password: string) => Promise<void>; loading?: boolean }> = ({ onSubmit, loading = false }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  return <Card className="mx-auto w-full max-w-md"><CardHeader><div className="mb-2 flex justify-center"><div className="rounded-full bg-primary/10 p-3"><KeyRound className="h-6 w-6 text-primary" /></div></div><CardTitle className="text-center">{t('auth.updatePassword')}</CardTitle><CardDescription className="text-center">{t('auth.updatePasswordDescription')}</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSubmit((data) => onSubmit(data.password))}><div><Label htmlFor="new-password">{t('auth.newPassword')}</Label><Input id="new-password" type="password" autoComplete="new-password" {...register('password')} />{errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}</div><div><Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label><Input id="confirm-password" type="password" autoComplete="new-password" {...register('confirmPassword')} />{errors.confirmPassword && <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>}</div><Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('auth.updatePassword')}</Button></form></CardContent></Card>;
};
