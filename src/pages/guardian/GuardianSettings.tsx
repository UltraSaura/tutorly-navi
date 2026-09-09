import { useLanguage } from '@/context/SimpleLanguageContext';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useState } from 'react';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User, Bell, Lock, Globe, Shield } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';

export default function GuardianSettings() {
  const ui = useInterfaceTranslation();
  const { language, changeLanguage } = useLanguage();
  const { user } = useAuth();
  const { guardianCountry } = useGuardianAuth();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState({
    exerciseCompleted: true,
    weeklyReport: true,
    lowPerformance: true,
    newAchievements: false,
  });

  const handleSaveProfile = () => {
    toast({
      title: ui("Profile updated"),
      description: ui("Your profile information has been saved."),
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: ui("Notifications updated"),
      description: ui("Your notification preferences have been saved."),
    });
  };

  return (
    <div className="space-y-6">
      <PageMeta title={ui("Settings")} description={ui("Configure your guardian account preferences and notifications.")} />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{ui("Guardian Settings")}</h1>
        <p className="text-muted-foreground mt-1">
          {ui("Manage your account preferences and security")}
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {ui("Profile Information")}
          </CardTitle>
          <CardDescription>
            {ui("Update your personal information")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{ui("First Name")}</Label>
              <Input
                id="firstName"
                defaultValue={user?.user_metadata?.first_name || ''}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{ui("Last Name")}</Label>
              <Input
                id="lastName"
                defaultValue={user?.user_metadata?.last_name || ''}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{ui("Email Address")}</Label>
            <Input
              id="email"
              type="email"
              defaultValue={user?.email || ''}
              placeholder="john.doe@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{ui("Phone Number")}</Label>
            <Input
              id="phone"
              type="tel"
              defaultValue={user?.user_metadata?.phone_number || ''}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">{ui("Country")}</Label>
            <Input
              id="country"
              defaultValue={guardianCountry || ''}
              placeholder={ui("United States")}
            />
          </div>

          <Button onClick={handleSaveProfile}>{ui("Save Changes")}</Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {ui("Notifications")}
          </CardTitle>
          <CardDescription>
            {ui("Choose what notifications you want to receive")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="exerciseCompleted">{ui("Exercise Completed")}</Label>
              <p className="text-sm text-muted-foreground">
                {ui("Get notified when your child completes an exercise")}
              </p>
            </div>
            <Switch
              id="exerciseCompleted"
              checked={notifications.exerciseCompleted}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, exerciseCompleted: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weeklyReport">{ui("Weekly Report")}</Label>
              <p className="text-sm text-muted-foreground">
                {ui("Receive a weekly summary of your children's progress")}
              </p>
            </div>
            <Switch
              id="weeklyReport"
              checked={notifications.weeklyReport}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, weeklyReport: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="lowPerformance">{ui("Performance Alerts")}</Label>
              <p className="text-sm text-muted-foreground">
                {ui("Get alerts when a child is struggling with a topic")}
              </p>
            </div>
            <Switch
              id="lowPerformance"
              checked={notifications.lowPerformance}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, lowPerformance: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="newAchievements">{ui("Achievement Notifications")}</Label>
              <p className="text-sm text-muted-foreground">
                {ui("Celebrate when your child earns an achievement")}
              </p>
            </div>
            <Switch
              id="newAchievements"
              checked={notifications.newAchievements}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, newAchievements: checked })
              }
            />
          </div>

          <Button onClick={handleSaveNotifications}>{ui("Save Preferences")}</Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {ui("Security")}
          </CardTitle>
          <CardDescription>
            {ui("Manage your account security settings")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline">{ui("Change Password")}</Button>
          <Button variant="outline">{ui("Enable Two-Factor Authentication")}</Button>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {ui("Language & Region")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">{ui("Language")}</Label>
            <select id="language" value={language} onChange={(event) => changeLanguage(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="en">{ui("English")}</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">{ui("Timezone")}</Label>
            <Input id="timezone" defaultValue="UTC-05:00 (EST)" />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            {ui("Privacy & Data")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline">{ui("Download My Data")}</Button>
          <Button variant="destructive">{ui("Delete Account")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

