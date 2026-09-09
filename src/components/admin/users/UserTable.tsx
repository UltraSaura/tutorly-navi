import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

import { useState } from 'react';
import { MoreHorizontal, ChevronLeft, ChevronRight, GraduationCap, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/types/admin';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generateNameFromEmail } from './utils';

interface UserTableProps {
  users: User[];
  selectedUser: User | null;
  onUserSelect: (user: User) => void;
  onAddChildClick: (user: User) => void;
}

export const UserTable = ({
  users,
  selectedUser,
  onUserSelect,
  onAddChildClick
}: UserTableProps) => {
  const ui = useInterfaceTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const totalPages = Math.ceil(users.length / usersPerPage);
  const currentUsers = users.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const getUserTypeIcon = (userType: 'student' | 'parent') => {
    return userType === 'student' ? (
      <GraduationCap className="h-4 w-4 text-blue-500" />
    ) : (
      <UsersRound className="h-4 w-4 text-purple-500" />
    );
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-4 py-3.5 text-left text-sm font-semibold">{ui("User")}</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">{ui("Name")}</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">{ui("Email")}</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">{ui("Type")}</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">{ui("Phone")}</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">{ui("Country")}</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">{ui("Level")}</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">{ui("Style")}</th>
            <th className="px-4 py-3.5 text-right text-sm font-semibold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {currentUsers.length > 0 ? (
            currentUsers.map((user) => {
              const displayName = user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : generateNameFromEmail(user.email);
              
              return (
                <tr 
                  key={user.id} 
                  className={`hover:bg-muted/50 cursor-pointer ${
                    selectedUser?.id === user.id ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => onUserSelect(user)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage src={`https://avatar.vercel.sh/${user.id}`} alt={displayName} />
                        <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium">{user.first_name || 'Not set'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {getUserTypeIcon(user.user_type)}
                      <span className="ml-1.5 text-sm capitalize">{user.user_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.phone_number || 'Not set'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.country || 'Not set'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.level || 'Not set'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.style || 'Not set'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{ui("Actions")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onUserSelect(user);
                        }}>{ui("View Details")}</DropdownMenuItem>
                        {user.user_type === 'parent' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onUserSelect(user);
                            onAddChildClick(user);
                          }}>
                            {ui("Add Child Account")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive">
                          {ui("Deactivate Account")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                {ui("No users found matching your filters.")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            {ui("Showing")} {(currentPage - 1) * usersPerPage + 1} {ui("to")} {Math.min(currentPage * usersPerPage, users.length)} {ui("of")} {users.length} {ui("users")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {ui("Page")} {currentPage} {ui("of")} {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
