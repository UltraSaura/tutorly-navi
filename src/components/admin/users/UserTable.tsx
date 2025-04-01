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
    <div className="rounded-md border">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-4 py-3.5 text-left text-sm font-semibold">User</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Type</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Level</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Style</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Contact</th>
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
                      <div>
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.country || 'No country'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {getUserTypeIcon(user.user_type)}
                      <span className="ml-1.5 text-sm capitalize">{user.user_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.level || 'Not specified'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.style || 'Not specified'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.phone_number || 'No phone'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onUserSelect(user);
                        }}>View Details</DropdownMenuItem>
                        {user.user_type === 'parent' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onUserSelect(user);
                            onAddChildClick(user);
                          }}>
                            Add Child Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive">
                          Deactivate Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                No users found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * usersPerPage + 1} to {Math.min(currentPage * usersPerPage, users.length)} of {users.length} users
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
              Page {currentPage} of {totalPages}
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
