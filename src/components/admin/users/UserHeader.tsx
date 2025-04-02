
import React from 'react';
import { UsersRound, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User as UserType } from '@/types/admin';
import { generateNameFromEmail } from './utils';

interface UserHeaderProps {
  user: UserType;
}

export const UserHeader = ({ user }: UserHeaderProps) => {
  const getUserTypeIcon = (userType: 'student' | 'parent') => {
    return userType === 'student' ? (
      <GraduationCap className="h-4 w-4 text-blue-500" />
    ) : (
      <UsersRound className="h-4 w-4 text-purple-500" />
    );
  };

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage 
            src={`https://avatar.vercel.sh/${user.id}`} 
            alt={user.first_name || user.email} 
          />
          <AvatarFallback>
            {user.first_name 
              ? user.first_name.charAt(0) 
              : user.email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>
            {user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : generateNameFromEmail(user.email)}
          </CardTitle>
          <CardDescription className="text-sm font-medium">{user.email}</CardDescription>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          {getUserTypeIcon(user.user_type)}
          <span className="capitalize">{user.user_type}</span>
        </Badge>
      </div>
    </div>
  );
};
