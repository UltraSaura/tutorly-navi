
import { useState, useEffect } from 'react';
import { Search, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, BarChart, CalendarDays, GraduationCap, User, UsersRound, UserCheck, Phone, Mail, MapPin, Plus, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  phone_number?: string;
  user_type: 'student' | 'parent';
  created_at: string;
  updated_at: string;
  // Virtual properties for UI
  activity?: {
    day: string;
    minutes: number;
  }[];
  subjects?: {
    name: string;
    progress: number;
  }[];
  children?: User[];
}

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

// Helper function to generate name from email if first/last name isn't available
const generateNameFromEmail = (email: string): string => {
  const parts = email.split('@')[0].split('.');
  const formattedParts = parts.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  );
  return formattedParts.join(' ');
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterUserType, setFilterUserType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [childEmail, setChildEmail] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const usersPerPage = 10;
  
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
        
        // Add virtual properties for UI purposes
        const processedUsers = data.map(user => ({
          ...user,
          activity: [...defaultActivity],
          subjects: user.user_type === 'student' ? [...defaultSubjects] : [],
        }));
        
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
          
          if (relationships.length > 0) {
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
            
            // Process children data and attach to parent
            const children = childrenData.map(child => ({
              ...child,
              activity: [...defaultActivity],
              subjects: [...defaultSubjects],
            }));
            
            // Find and update the parent in our state
            const updatedUsers = processedUsers.map(u => 
              u.id === parent.id ? { ...u, children } : u
            );
            
            setUsers(updatedUsers);
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
      : generateNameFromEmail(user.email);
    
    const matchesSearch = 
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.country && user.country.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.phone_number && user.phone_number.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesUserType = filterUserType === 'all' || user.user_type === filterUserType;
    
    return matchesSearch && matchesUserType;
  });
  
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );
  
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };
  
  const averageMinutes = (user: User) => {
    const total = user.activity?.reduce((acc, day) => acc + day.minutes, 0) || 0;
    return Math.round(total / (user.activity?.length || 1));
  };
  
  const totalMinutes = (user: User) => {
    return user.activity?.reduce((acc, day) => acc + day.minutes, 0) || 0;
  };

  const getUserTypeIcon = (userType: 'student' | 'parent') => {
    return userType === 'student' ? (
      <GraduationCap className="h-4 w-4 text-blue-500" />
    ) : (
      <UsersRound className="h-4 w-4 text-purple-500" />
    );
  };
  
  const handleAddChildAccount = async () => {
    if (!selectedUser || selectedUser.user_type !== 'parent') {
      toast.error('You must select a parent to add a child');
      return;
    }
    
    if (!childEmail || !childFirstName || !childLastName) {
      toast.error('Please fill out all fields');
      return;
    }
    
    try {
      // Create the child account in auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: childEmail,
        password: Math.random().toString(36).slice(-8), // Generate a random password
        options: {
          data: {
            user_type: 'student',
            first_name: childFirstName,
            last_name: childLastName
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
          first_name: childFirstName,
          last_name: childLastName
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
        email: childEmail,
        first_name: childFirstName,
        last_name: childLastName,
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
      
      // Reset form fields
      setChildEmail('');
      setChildFirstName('');
      setChildLastName('');
      setIsAddChildDialogOpen(false);
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
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, country..."
                    className="pl-8 w-full sm:w-[300px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Select value={filterUserType} onValueChange={setFilterUserType}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="User Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="parent">Parents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                    <Button 
                      className="mt-4" 
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-3.5 text-left text-sm font-semibold">User</th>
                        <th className="px-4 py-3.5 text-left text-sm font-semibold">Type</th>
                        <th className="px-4 py-3.5 text-left text-sm font-semibold">Country</th>
                        <th className="px-4 py-3.5 text-left text-sm font-semibold">Email</th>
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
                              onClick={() => handleUserSelect(user)}
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
                                      {user.phone_number || 'No phone'}
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
                                {user.country || 'Not specified'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {user.email}
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
                                      handleUserSelect(user);
                                    }}>View Details</DropdownMenuItem>
                                    {user.user_type === 'parent' && (
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleUserSelect(user);
                                        setIsAddChildDialogOpen(true);
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
                          <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                            No users found matching your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * usersPerPage + 1} to {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full md:w-1/3 space-y-6">
          {selectedUser ? (
            <Card className="glass">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={`https://avatar.vercel.sh/${selectedUser.id}`} 
                        alt={selectedUser.first_name || selectedUser.email} 
                      />
                      <AvatarFallback>
                        {selectedUser.first_name 
                          ? selectedUser.first_name.charAt(0) 
                          : selectedUser.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>
                        {selectedUser.first_name && selectedUser.last_name
                          ? `${selectedUser.first_name} ${selectedUser.last_name}`
                          : generateNameFromEmail(selectedUser.email)}
                      </CardTitle>
                      <CardDescription>{selectedUser.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getUserTypeIcon(selectedUser.user_type)}
                      <span className="capitalize">{selectedUser.user_type}</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full glass">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    {selectedUser.user_type === 'student' && (
                      <TabsTrigger value="progress">Progress</TabsTrigger>
                    )}
                    {selectedUser.user_type === 'parent' && (
                      <TabsTrigger value="children">Children</TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="overview" className="pt-4">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Email</p>
                          </div>
                          <p className="text-sm pl-6">{selectedUser.email}</p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Phone</p>
                          </div>
                          <p className="text-sm pl-6">{selectedUser.phone_number || 'Not provided'}</p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Country</p>
                          </div>
                          <p className="text-sm pl-6">{selectedUser.country || 'Not provided'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Joined</p>
                          <p className="text-sm">
                            {new Date(selectedUser.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Last Updated</p>
                          <p className="text-sm">
                            {new Date(selectedUser.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">Weekly Activity</h3>
                          <p className="text-sm text-muted-foreground">
                            Avg. {averageMinutes(selectedUser)} min/day
                          </p>
                        </div>
                        <div className="h-[120px] mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedUser.activity}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="day" />
                              <YAxis />
                              <Tooltip />
                              <Line
                                type="monotone"
                                dataKey="minutes"
                                name="Minutes"
                                stroke="#3a6ff5"
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      {selectedUser.user_type === 'student' && selectedUser.subjects && selectedUser.subjects.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium">Subjects Progress</h3>
                          {selectedUser.subjects.map((subject, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{subject.name}</span>
                                <span>{subject.progress}%</span>
                              </div>
                              <Progress value={subject.progress} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="activity" className="pt-4">
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 border rounded-lg p-3 text-center">
                          <CalendarDays className="h-6 w-6 mx-auto text-blue-500" />
                          <p className="text-sm font-medium">Last Update</p>
                          <p className="text-sm">
                            {new Date(selectedUser.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="space-y-2 border rounded-lg p-3 text-center">
                          <BarChart className="h-6 w-6 mx-auto text-purple-500" />
                          <p className="text-sm font-medium">Weekly Usage</p>
                          <p className="text-sm">{totalMinutes(selectedUser)} mins</p>
                        </div>
                        {selectedUser.user_type === 'student' ? (
                          <div className="space-y-2 border rounded-lg p-3 text-center">
                            <GraduationCap className="h-6 w-6 mx-auto text-green-500" />
                            <p className="text-sm font-medium">Avg. Grade</p>
                            <p className="text-sm">B+ (85%)</p>
                          </div>
                        ) : (
                          <div className="space-y-2 border rounded-lg p-3 text-center">
                            <UsersRound className="h-6 w-6 mx-auto text-green-500" />
                            <p className="text-sm font-medium">Children</p>
                            <p className="text-sm">{selectedUser.children?.length || 0}</p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-3">Daily Activity</h3>
                        <div className="space-y-3">
                          {selectedUser.activity?.map((day, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${day.minutes > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-sm">{day.day}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-[100px] bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-500 h-1.5 rounded-full"
                                    style={{ width: `${(day.minutes / 80) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm w-12 text-right">
                                  {day.minutes} min
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-3">Recent Sessions</h3>
                        <div className="space-y-2">
                          {selectedUser.user_type === 'student' ? (
                            [
                              { date: '2023-06-14', topic: 'Algebra Practice', duration: 35 },
                              { date: '2023-06-12', topic: 'Essay Feedback', duration: 25 },
                              { date: '2023-06-10', topic: 'Science Homework', duration: 40 },
                            ].map((session, idx) => (
                              <div key={idx} className="border rounded-md p-3">
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium">{session.topic}</p>
                                  <p className="text-sm text-muted-foreground">{session.duration} min</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{session.date}</p>
                              </div>
                            ))
                          ) : (
                            [
                              { date: '2023-06-14', topic: 'Progress Review', duration: 20 },
                              { date: '2023-06-10', topic: 'Teacher Meeting', duration: 15 },
                              { date: '2023-06-08', topic: 'Account Settings', duration: 10 },
                            ].map((session, idx) => (
                              <div key={idx} className="border rounded-md p-3">
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium">{session.topic}</p>
                                  <p className="text-sm text-muted-foreground">{session.duration} min</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{session.date}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {selectedUser.user_type === 'student' && (
                    <TabsContent value="progress" className="pt-4">
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-medium mb-3">Subject Mastery</h3>
                          {selectedUser.subjects?.map((subject, idx) => (
                            <div key={idx} className="mb-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{subject.name}</span>
                                <span>{subject.progress}%</span>
                              </div>
                              <Progress value={subject.progress} className="h-2" />
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Beginner</span>
                                <span>Intermediate</span>
                                <span>Advanced</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-3">Recent Grades</h3>
                          <div className="space-y-2">
                            {[
                              { assignment: 'Math Quiz', grade: 92, date: '2023-06-10' },
                              { assignment: 'Science Report', grade: 85, date: '2023-06-07' },
                              { assignment: 'Essay', grade: 78, date: '2023-06-03' },
                              { assignment: 'History Test', grade: 88, date: '2023-05-28' },
                            ].map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 border-b">
                                <div>
                                  <p className="text-sm font-medium">{item.assignment}</p>
                                  <p className="text-xs text-muted-foreground">{item.date}</p>
                                </div>
                                <Badge className={
                                  item.grade >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                  item.grade >= 80 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                  item.grade >= 70 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' :
                                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                }>
                                  {item.grade}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )}
                  
                  {selectedUser.user_type === 'parent' && (
                    <TabsContent value="children" className="pt-4">
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium">Children Accounts</h3>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8" 
                              onClick={() => setIsAddChildDialogOpen(true)}
                            >
                              <UserPlus className="h-3.5 w-3.5 mr-1" />
                              Add Child
                            </Button>
                          </div>
                          
                          {selectedUser.children && selectedUser.children.length > 0 ? (
                            <div className="space-y-3">
                              {selectedUser.children.map((child) => {
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
                                      onClick={() => handleUserSelect(child)}
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
                                onClick={() => setIsAddChildDialogOpen(true)}
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
                              { date: '2023-06-14', action: 'Reviewed homework', child: selectedUser.children?.[0]?.first_name || 'Child' },
                              { date: '2023-06-12', action: 'Updated account settings', child: 'Account' },
                              { date: '2023-06-10', action: 'Messaged teacher', child: selectedUser.children?.[0]?.first_name || 'Child' },
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
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
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
      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Child Account</DialogTitle>
            <DialogDescription>
              Create a new student account for this parent's child.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="childEmail" className="text-right">
                Email
              </Label>
              <Input
                id="childEmail"
                type="email"
                value={childEmail}
                onChange={(e) => setChildEmail(e.target.value)}
                className="col-span-3"
                placeholder="child@example.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                First name
              </Label>
              <Input
                id="firstName"
                value={childFirstName}
                onChange={(e) => setChildFirstName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Last name
              </Label>
              <Input
                id="lastName"
                value={childLastName}
                onChange={(e) => setChildLastName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddChildDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddChildAccount}>
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
