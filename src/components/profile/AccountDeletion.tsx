import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AccountDeletion = () => {
  const { deleteAccount } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const requiredText = 'DELETE';

  const handleDeleteAccount = async () => {
    if (confirmText !== requiredText) {
      toast({
        title: t('profile.deleteAccount.error'),
        description: t('profile.deleteAccount.confirmTextError'),
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      toast({
        title: t('profile.deleteAccount.success'),
        description: t('profile.deleteAccount.successMessage'),
      });
      // Redirect will happen automatically in AuthContext
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t('profile.deleteAccount.error'),
        description: t('profile.deleteAccount.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
      setConfirmText('');
    }
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          {t('profile.deleteAccount.title')}
        </CardTitle>
        <CardDescription>
          {t('profile.deleteAccount.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('profile.deleteAccount.warning')}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-white">
            {t('profile.deleteAccount.consequences')}
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
            <li>• {t('profile.deleteAccount.consequence1')}</li>
            <li>• {t('profile.deleteAccount.consequence2')}</li>
            <li>• {t('profile.deleteAccount.consequence3')}</li>
            <li>• {t('profile.deleteAccount.consequence4')}</li>
          </ul>
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              {t('profile.deleteAccount.button')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                {t('profile.deleteAccount.confirmTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>{t('profile.deleteAccount.confirmDescription')}</p>
                <div className="space-y-2">
                  <Label htmlFor="confirmDelete">
                    {t('profile.deleteAccount.typeToConfirm')} <strong>DELETE</strong>
                  </Label>
                  <Input
                    id="confirmDelete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="font-mono"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText('')}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={confirmText !== requiredText || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? t('profile.deleteAccount.deleting') : t('profile.deleteAccount.confirmButton')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AccountDeletion;