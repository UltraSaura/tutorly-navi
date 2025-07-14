import React from 'react';
import { UserType } from '@/types/registration';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UserTypeSelectionProps {
  onSelect: (userType: UserType) => void;
}

export const UserTypeSelection: React.FC<UserTypeSelectionProps> = ({ onSelect }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('auth.selectUserType')}
        </h2>
        <p className="text-muted-foreground">
          {t('auth.selectUserTypeDescription')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className="cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
          onClick={() => onSelect('student')}
        >
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">{t('auth.student')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('auth.studentDescription')}
            </p>
            <Button className="w-full">
              {t('auth.continueAsStudent')}
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
          onClick={() => onSelect('parent')}
        >
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">{t('auth.parent')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('auth.parentDescription')}
            </p>
            <Button className="w-full">
              {t('auth.continueAsParent')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};