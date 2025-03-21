
import { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/admin';
import { UserTable } from './users/UserTable';
import { UserDetails } from './users/UserDetails';
import { AddChildDialog } from './users/AddChildDialog';
import { UserSearch } from './users/UserSearch';

const defaultActivity = [
  { day: 'Mon', minutes: 45 },
  { day: 'Tue', minutes: 32 },
  { day: 'Wed', minutes: 50 },
  { day: 'Thu', minutes: 20 },
  { day: 'Fri', minutes: 65 },
  { day: 'Sat', minutes: 10 },
  { day: 'Sun', minutes: 30 },
];

const defaultSubjects = [
  { name: 'Math', progress: 78 },
  { name: 'Science', progress: 92 },
  { name: 'English', progress: 65 },
];

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterUserType, setFilterUserType] = useState<string>('all');
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  
  // Fetch users from Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('users')
          .select('*');
        
        if (error) {
          console.error('Error fetching users:', error);
          setError('Failed to load users. Please try again later.');
          toast.error('Failed to load users');
          return;
        }
        
        // Add virtual properties for UI purposes and ensure user_type is cast to the correct type
        const processedUsers = data.map(user => ({
          ...user,
          user_type: user.user_type as 'student' | 'parent', // Cast to ensure type safety
          activity: [...defaultActivity],
          subjects: user.user_type === 'student' ? [...defaultSubjects] : [],
        })) as User[];
        
        setUsers(processedUsers);
        
        // Fetch parent-child relationships for parents
        const parentUsers = processedUsers.filter(user => user.user_type === 'parent');
        
        for (const parent of parentUsers) {
          // Get all child IDs for this parent
          const { data: relationships, error: relError } = await supabase
            .from('parent_child')
            .select('child_id')
            .eq('parent_id', parent.id);
          
          if (relError) {
            console.error('Error fetching parent-child relationships:', relError);
            continue;
          }
          
          if (relationships && relationships.length > 0) {
            const childIds = relationships.map(rel => rel.child_id);
            
            // Get all children data
            const { data: childrenData, error: childrenError } = await supabase
              .from('users')
              .select('*')
              .in('id', childIds);
            
            if (childrenError) {
              console.error('Error fetching children data:', childrenError);
              continue;
            }
            
            if (childrenData) {
              // Process children data and attach to parent
              const children = childrenData.map(child => ({
                ...child,
                user_type: child.user_type as 'student' | 'parent', // Cast to ensure type safety
                activity: [...defaultActivity],
                subjects: [...defaultSubjects],
              })) as User[];
              
              // Find and update the parent in our state
              const updatedUsers = processedUsers.map(u => 
                u.id === parent.id ? { ...u, children } : u
              ) as User[];
              
              setUsers(updatedUsers);
            }
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  const filteredUsers = users.filter(user => {
    // Name should match email or first/last name if the user hasn't set them
    const displayName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`
      : user.email.split('@')[0].replace(/[.]/g, ' ');
    
    const matchesSearch = 
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.country && user.country.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.phone_number && user.phone_number.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesUserType = filterUserType === 'all' || user.user_type === filterUserType;
    
    return matchesSearch && matchesUserType;
  });
  
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleAddChildAccount = async (email: string, firstName: string, lastName: string) => {
    if (!selectedUser || selectedUser.user_type !== 'parent') {
      toast.error('You must select a parent to add a child');
      return;
    }
    
    try {
      // Create the child account in auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: Math.random().toString(36).slice(-8), // Generate a random password
        options: {
          data: {
            user_type: 'student',
            first_name: firstName,
            last_name: lastName
          }
        }
      });
      
      if (signUpError) {
        console.error('Error creating child account:', signUpError);
        toast.error('Failed to create child account');
        return;
      }
      
      if (!signUpData.user) {
        toast.error('Failed to create user account');
        return;
      }
      
      // Update the first_name and last_name in the users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', signUpData.user.id);
      
      if (updateError) {
        console.error('Error updating child profile:', updateError);
        toast.error('Failed to update child profile');
        return;
      }
      
      // Create the parent-child relationship
      const { error: relationshipError } = await supabase
        .from('parent_child')
        .insert({
          parent_id: selectedUser.id,
          child_id: signUpData.user.id
        });
      
      if (relationshipError) {
        console.error('Error creating parent-child relationship:', relationshipError);
        toast.error('Failed to link child to parent');
        return;
      }
      
      // Success! Update UI
      toast.success('Child account created and linked to parent');
      
      // Add the child to the parent's children array
      const newChild: User = {
        id: signUpData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        user_type: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        activity: [...defaultActivity],
        subjects: [...defaultSubjects]
      };
      
      // Update the selected user with the new child
      const updatedUser = {
        ...selectedUser,
        children: [...(selectedUser.children || []), newChild]
      };
      
      // Update the users state with the new child and updated parent
      setUsers(prevUsers => [
        ...prevUsers.map(user => user.id === selectedUser.id ? updatedUser : user),
        newChild
      ]);
      
      // Update selected user
      setSelectedUser(updatedUser);
    } catch (err) {
      console.error('Unexpected error creating child account:', err);
      toast.error('Failed to create child account');
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage student and parent accounts
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3 space-y-6">
          <Card className="glass">
            <CardContent className="pt-6">
              <UserSearch
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterUserType={filterUserType}
                onFilterUserTypeChange={setFilterUserType}
              />
              
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 relative">
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-studywhiz-600 rounded-full animate-spin border-t-transparent"></div>
                    </div>
                    <p className="mt-4 text-lg font-medium">Loading users...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <p className="text-lg text-red-500">{error}</p>
                    <button 
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" 
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <UserTable
                    users={filteredUsers}
                    selectedUser={selectedUser}
                    onUserSelect={handleUserSelect}
                    onAddChildClick={() => setIsAddChildDialogOpen(true)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full md:w-1/3 space-y-6">
          {selectedUser ? (
            <UserDetails
              user={selectedUser}
              onAddChildClick={() => setIsAddChildDialogOpen(true)}
              onUserSelect={handleUserSelect}
            />
          ) : (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-center text-muted-foreground">
                  Select a user to view detailed information and statistics
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Add Child Dialog */}
      <AddChildDialog
        open={isAddChildDialogOpen}
        onOpenChange={setIsAddChildDialogOpen}
        selectedParent={selectedUser}
        onAddChild={handleAddChildAccount}
      />
    </div>
  );
};

export default UserManagement;
