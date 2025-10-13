import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountriesAndLevels } from '@/hooks/useCountriesAndLevels';
import { ChildRegistrationData } from '@/types/registration';
import { getPhoneAreaCode } from '@/utils/phoneAreaCodes';

const childSchema = z.object({
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  country: z.string().min(1, 'Country is required'),
  phoneNumber: z.string().optional(),
  schoolLevel: z.string().min(1, 'School level is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChildFormData = z.infer<typeof childSchema>;

interface AddChildFormProps {
  defaultCountry?: string;
  onSubmit: (data: ChildRegistrationData) => void;
  isSubmitting: boolean;
}

export default function AddChildForm({ defaultCountry, onSubmit, isSubmitting }: AddChildFormProps) {
  const { countries, schoolLevels, getSchoolLevelsByCountry } = useCountriesAndLevels(defaultCountry || 'US');
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry || 'US');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      country: defaultCountry || 'US',
    },
  });

  const country = watch('country');

  const handleFormSubmit = (data: ChildFormData) => {
    const { confirmPassword, ...registrationData } = data;
    
    // Format phone number with area code if provided
    let formattedPhone = registrationData.phoneNumber;
    if (formattedPhone && formattedPhone.trim()) {
      const areaCode = getPhoneAreaCode(country);
      if (areaCode && !formattedPhone.startsWith('+')) {
        formattedPhone = `${areaCode}${formattedPhone}`;
      }
    } else {
      formattedPhone = undefined;
    }

    const childData: ChildRegistrationData = {
      email: registrationData.email || undefined,
      password: registrationData.password,
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      username: registrationData.username,
      country: registrationData.country,
      schoolLevel: registrationData.schoolLevel,
      phoneNumber: formattedPhone,
    };

    onSubmit(childData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...register('lastName')}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (Optional - for notifications)</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="child@example.com (optional)"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank if child doesn't need email notifications
        </p>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username (for login)</Label>
        <Input
          id="username"
          {...register('username')}
          placeholder="e.g., sarah_2024"
        />
        <p className="text-xs text-muted-foreground">
          Child will use this username to log in (not email)
        </p>
        {errors.username && (
          <p className="text-sm text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            {...register('password')}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select
          value={country}
          onValueChange={(value) => {
            setValue('country', value);
            setSelectedCountry(value);
            setValue('schoolLevel', ''); // Reset school level when country changes
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.country && (
          <p className="text-sm text-destructive">{errors.country.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
        <div className="flex gap-2">
          <span className="flex items-center px-3 bg-muted rounded-md text-sm">
            {getPhoneAreaCode(selectedCountry)}
          </span>
          <Input
            id="phoneNumber"
            type="tel"
            {...register('phoneNumber')}
            placeholder="123456789"
          />
        </div>
        {errors.phoneNumber && (
          <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="schoolLevel">School Level</Label>
        <Select
          value={watch('schoolLevel') || ''}
          onValueChange={(value) => setValue('schoolLevel', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select school level" />
          </SelectTrigger>
          <SelectContent>
            {getSchoolLevelsByCountry(selectedCountry).map((level) => (
              <SelectItem key={level.level_code} value={level.level_code}>
                {level.level_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.schoolLevel && (
          <p className="text-sm text-destructive">{errors.schoolLevel.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating Account...' : 'Create Child Account'}
      </Button>
    </form>
  );
}
