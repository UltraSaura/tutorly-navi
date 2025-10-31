
import React from 'react';
import { UserPlus, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserType } from '@/types/admin';
import { generateNameFromEmail } from '../utils';

interface ChildrenTabProps {
  user: UserType;
  onAddChildClick: () => void;
  onUserSelect: (user: UserType) => void;
}

export const ChildrenTab = ({ user, onAddChildClick, onUserSelect }: ChildrenTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Children Accounts</h3>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8" 
            onClick={onAddChildClick}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Add Child
          </Button>
        </div>
        
        {user.children && user.children.length > 0 ? (
          <div className="space-y-3">
            {user.children.map((child) => {
              const childName = child.first_name && child.last_name
                ? `${child.first_name} ${child.last_name}`
                : generateNameFromEmail(child.email);
                
              return (
                <div key={child.id} className="border rounded-md p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${child.id}`} alt={childName} />
                      <AvatarFallback>{childName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{childName}</p>
                      <p className="text-xs text-muted-foreground">{child.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onUserSelect(child)}
                  >
                    Details
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 border rounded-md">
            <UsersRound className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No child accounts yet</p>
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={onAddChildClick}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Child Account
            </Button>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {[
            { date: '2023-06-14', action: 'Reviewed homework', child: user.children?.[0]?.first_name || 'Child' },
            { date: '2023-06-12', action: 'Updated account settings', child: 'Account' },
            { date: '2023-06-10', action: 'Messaged teacher', child: user.children?.[0]?.first_name || 'Child' },
          ].map((activity, idx) => (
            <div key={idx} className="border rounded-md p-3">
              <p className="text-sm font-medium">{activity.action}</p>
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">{activity.date}</p>
                <p className="text-xs font-medium">{activity.child}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
