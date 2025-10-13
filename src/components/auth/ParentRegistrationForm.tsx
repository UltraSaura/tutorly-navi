import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCountriesAndLevels } from '@/hooks/useCountriesAndLevels';
import { ParentRegistrationData } from '@/types/registration';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { getPhoneAreaCode } from '@/utils/phoneAreaCodes';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useUserProfile } from '@/hooks/useUserProfile';

const childSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  schoolLevel: z.string().min(1, "School level is required"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  password: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

const parentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  phoneNumber: z.string().min(1),
  children: z.array(childSchema).min(1, "At least one child is required"),
  sharedChildPassword: z.string().min(6).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ParentFormData = z.infer<typeof parentSchema>;

interface ParentRegistrationFormProps {
  onSubmit: (data: ParentRegistrationData) => Promise<void>;
  onBack: () => void;
  loading?: boolean;
}

export const ParentRegistrationForm: React.FC<ParentRegistrationFormProps> = ({
  onSubmit,
  onBack,
  loading = false
}) => {
  const { t } = useTranslation();
  const { setLanguageFromCountry } = useLanguage();
  const { profile } = useUserProfile();
  const { countries, getSchoolLevelsByCountry, loading: dataLoading, selectedCountry, setCountry } = useCountriesAndLevels(profile?.country);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control
  } = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      children: [{ firstName: '', schoolLevel: '', username: '', password: '', email: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'children'
  });

  const watchedChildren = watch('children');
  const watchedCountry = watch('country');

  const onFormSubmit = async (data: ParentFormData) => {
    const { confirmPassword, ...parentData } = data;
    await onSubmit(parentData as ParentRegistrationData);
  };

  const addChild = () => {
    append({ firstName: '', schoolLevel: '', username: '', password: '', email: '' });
  };

  const removeChild = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>{t('auth.parentRegistration')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Parent Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('auth.parentInformation')}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  className={errors.lastName ? 'border-destructive' : ''}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">{t('auth.email')} (Username)</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="country">{t('auth.country')}</Label>
              <Select onValueChange={(value) => {
                setValue('country', value);
                setLanguageFromCountry(value);
                // Reset all children's school levels when parent's country changes
                for (let i = 0; i < fields.length; i++) {
                  setValue(`children.${i}.schoolLevel`, '');
                }
              }} value={selectedCountry}>
                <SelectTrigger className={errors.country ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('auth.selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phoneNumber">{t('auth.phoneNumber')}</Label>
              <div className="flex">
                <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-muted-foreground">
                  {watchedCountry ? getPhoneAreaCode(watchedCountry) : '+'}
                </div>
                <Input
                  id="phoneNumber"
                  type="tel"
                  {...register('phoneNumber')}
                  className={`rounded-l-none ${errors.phoneNumber ? 'border-destructive' : ''}`}
                  placeholder="123456789"
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-sm text-destructive mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          {/* NEW: Shared Password for Children */}
          <div>
            <Label htmlFor="sharedChildPassword">
              {t('auth.sharedChildPassword')} (Optional)
            </Label>
            <Input
              id="sharedChildPassword"
              type="password"
              {...register('sharedChildPassword')}
              placeholder="Password for all children (or set individually)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use one password for all children, or set individual passwords below
            </p>
          </div>

          {/* Children Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('auth.childrenInformation')}</h3>
              <Button type="button" variant="outline" onClick={addChild}>
                <Plus className="w-4 h-4 mr-2" />
                {t('auth.addChild')}
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{t('auth.child')} {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label>{t('auth.firstName')}</Label>
                    <Input
                      {...register(`children.${index}.firstName`)}
                      className={errors.children?.[index]?.firstName ? 'border-destructive' : ''}
                    />
                    {errors.children?.[index]?.firstName && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.children[index]?.firstName?.message}
                      </p>
                    )}
                  </div>

                  {/* NEW: Username field */}
                  <div>
                    <Label>{t('auth.username')}</Label>
                    <Input 
                      {...register(`children.${index}.username`)} 
                      placeholder="e.g., john_2024"
                      className={errors.children?.[index]?.username ? 'border-destructive' : ''}
                    />
                    {errors.children?.[index]?.username && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.children[index]?.username?.message}
                      </p>
                    )}
                  </div>

                  {/* NEW: Optional email field */}
                  <div>
                    <Label>{t('auth.emailOptional')}</Label>
                    <Input 
                      {...register(`children.${index}.email`)} 
                      type="email"
                      placeholder="For notifications (optional)"
                      className={errors.children?.[index]?.email ? 'border-destructive' : ''}
                    />
                    {errors.children?.[index]?.email && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.children[index]?.email?.message}
                      </p>
                    )}
                  </div>

                  {/* NEW: Optional individual password */}
                  <div>
                    <Label>{t('auth.individualPassword')} (Optional)</Label>
                    <Input 
                      {...register(`children.${index}.password`)} 
                      type="password"
                      placeholder="Leave empty to use shared password"
                      className={errors.children?.[index]?.password ? 'border-destructive' : ''}
                    />
                    {errors.children?.[index]?.password && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.children[index]?.password?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>{t('auth.schoolLevel')}</Label>
                    <Select 
                      value={watchedChildren[index]?.schoolLevel || ''}
                      onValueChange={(value) => setValue(`children.${index}.schoolLevel`, value)}
                      disabled={!watchedCountry}
                    >
                      <SelectTrigger className={errors.children?.[index]?.schoolLevel ? 'border-destructive' : ''}>
                        <SelectValue placeholder={t('auth.selectSchoolLevel')} />
                      </SelectTrigger>
                      <SelectContent>
                        {watchedCountry && 
                          getSchoolLevelsByCountry(watchedCountry).map((level) => (
                            <SelectItem key={level.level_code} value={level.level_code}>
                              {level.level_name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    {errors.children?.[index]?.schoolLevel && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.children[index]?.schoolLevel?.message}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {errors.children?.root && (
              <p className="text-sm text-destructive">{errors.children.root.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('auth.createAccount')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};