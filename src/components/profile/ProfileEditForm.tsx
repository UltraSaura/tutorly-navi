import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserCurriculumProfile } from '@/hooks/useUserCurriculumProfile';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap } from 'lucide-react';
import { getCountries, getLevelsByCountry } from '@/lib/curriculum';

export function ProfileEditForm() {
  const { profile, updateProfile, isUpdating } = useUserCurriculumProfile();
  const { toast } = useToast();
  
  const [countryCode, setCountryCode] = useState<string>(profile?.countryCode || '');
  const [levelCode, setLevelCode] = useState<string>(profile?.levelCode || '');

  useEffect(() => {
    if (profile) {
      setCountryCode(profile.countryCode);
      setLevelCode(profile.levelCode);
    }
  }, [profile]);

  const countries = getCountries();
  const levels = countryCode ? getLevelsByCountry(countryCode) : [];

  const handleCountryChange = (value: string) => {
    setCountryCode(value);
    setLevelCode('');
  };

  const handleSave = () => {
    if (!countryCode || !levelCode) {
      toast({
        title: 'Incomplete',
        description: 'Please select both country and level',
        variant: 'destructive',
      });
      return;
    }

    updateProfile(
      { countryCode, levelCode },
      {
        onSuccess: () => {
          toast({
            title: 'Profile Updated',
            description: 'Your school program has been saved',
          });
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to update profile',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          School Program
        </CardTitle>
        <CardDescription>
          Select your country and grade level to see personalized learning content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <Label>Country</Label>
            <Select value={countryCode} onValueChange={handleCountryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Level</Label>
            <Select 
              value={levelCode} 
              onValueChange={setLevelCode}
              disabled={!countryCode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {levels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isUpdating || !countryCode || !levelCode}
          className="w-full"
        >
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save School Program
        </Button>
      </CardContent>
    </Card>
  );
}
