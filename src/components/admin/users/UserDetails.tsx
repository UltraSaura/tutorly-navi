
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User as UserType } from '@/types/admin';
import { UserHeader } from './UserHeader';
import { OverviewTab } from './tabs/OverviewTab';
import { ActivityTab } from './tabs/ActivityTab';
import { ProgressTab } from './tabs/ProgressTab';
import { ChildrenTab } from './tabs/ChildrenTab';

interface UserDetailsProps {
  user: UserType;
  onAddChildClick: () => void;
  onUserSelect: (user: UserType) => void;
}

export const UserDetails = ({ user, onAddChildClick, onUserSelect }: UserDetailsProps) => {
  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <UserHeader user={user} />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 w-full glass">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            {user.user_type === 'student' && (
              <TabsTrigger value="progress">Progress</TabsTrigger>
            )}
            {user.user_type === 'parent' && (
              <TabsTrigger value="children">Children</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="overview" className="pt-4">
            <OverviewTab user={user} />
          </TabsContent>
          
          <TabsContent value="activity" className="pt-4">
            <ActivityTab user={user} />
          </TabsContent>
          
          {user.user_type === 'student' && (
            <TabsContent value="progress" className="pt-4">
              <ProgressTab user={user} />
            </TabsContent>
          )}
          
          {user.user_type === 'parent' && (
            <TabsContent value="children" className="pt-4">
              <ChildrenTab 
                user={user} 
                onAddChildClick={onAddChildClick}
                onUserSelect={onUserSelect}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
