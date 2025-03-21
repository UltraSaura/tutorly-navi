
import { useState } from 'react';
import { Search, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, BarChart, CalendarDays, GraduationCap } from 'lucide-react';
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

interface User {
  id: string;
  name: string;
  email: string;
  grade: string;
  country: string;
  joinDate: Date;
  lastActive: Date;
  status: 'active' | 'inactive';
  subjects: {
    name: string;
    progress: number;
  }[];
  activity: {
    day: string;
    minutes: number;
  }[];
}

const users: User[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    grade: '7th Grade',
    country: 'United States',
    joinDate: new Date(2023, 1, 15),
    lastActive: new Date(2023, 6, 13),
    status: 'active',
    subjects: [
      { name: 'Math', progress: 78 },
      { name: 'Science', progress: 92 },
      { name: 'English', progress: 65 },
    ],
    activity: [
      { day: 'Mon', minutes: 45 },
      { day: 'Tue', minutes: 32 },
      { day: 'Wed', minutes: 50 },
      { day: 'Thu', minutes: 20 },
      { day: 'Fri', minutes: 65 },
      { day: 'Sat', minutes: 10 },
      { day: 'Sun', minutes: 30 },
    ],
  },
  {
    id: '2',
    name: 'Sophia Kim',
    email: 'sophia.k@example.com',
    grade: '9th Grade',
    country: 'Canada',
    joinDate: new Date(2023, 3, 10),
    lastActive: new Date(2023, 6, 14),
    status: 'active',
    subjects: [
      { name: 'Math', progress: 85 },
      { name: 'Science', progress: 88 },
      { name: 'History', progress: 90 },
    ],
    activity: [
      { day: 'Mon', minutes: 65 },
      { day: 'Tue', minutes: 45 },
      { day: 'Wed', minutes: 35 },
      { day: 'Thu', minutes: 70 },
      { day: 'Fri', minutes: 55 },
      { day: 'Sat', minutes: 30 },
      { day: 'Sun', minutes: 25 },
    ],
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.c@example.com',
    grade: '5th Grade',
    country: 'Australia',
    joinDate: new Date(2023, 4, 5),
    lastActive: new Date(2023, 6, 10),
    status: 'inactive',
    subjects: [
      { name: 'Math', progress: 60 },
      { name: 'Reading', progress: 78 },
      { name: 'Science', progress: 72 },
    ],
    activity: [
      { day: 'Mon', minutes: 30 },
      { day: 'Tue', minutes: 45 },
      { day: 'Wed', minutes: 0 },
      { day: 'Thu', minutes: 25 },
      { day: 'Fri', minutes: 15 },
      { day: 'Sat', minutes: 40 },
      { day: 'Sun', minutes: 0 },
    ],
  },
  {
    id: '4',
    name: 'Emma Thompson',
    email: 'emma.t@example.com',
    grade: '11th Grade',
    country: 'United Kingdom',
    joinDate: new Date(2023, 2, 20),
    lastActive: new Date(2023, 6, 12),
    status: 'active',
    subjects: [
      { name: 'Math', progress: 95 },
      { name: 'Physics', progress: 90 },
      { name: 'Literature', progress: 88 },
    ],
    activity: [
      { day: 'Mon', minutes: 55 },
      { day: 'Tue', minutes: 60 },
      { day: 'Wed', minutes: 70 },
      { day: 'Thu', minutes: 45 },
      { day: 'Fri', minutes: 50 },
      { day: 'Sat', minutes: 30 },
      { day: 'Sun', minutes: 40 },
    ],
  },
  {
    id: '5',
    name: 'Carlos Rodriguez',
    email: 'carlos.r@example.com',
    grade: '8th Grade',
    country: 'Mexico',
    joinDate: new Date(2023, 5, 1),
    lastActive: new Date(2023, 6, 11),
    status: 'active',
    subjects: [
      { name: 'Spanish', progress: 98 },
      { name: 'Math', progress: 75 },
      { name: 'History', progress: 82 },
    ],
    activity: [
      { day: 'Mon', minutes: 40 },
      { day: 'Tue', minutes: 35 },
      { day: 'Wed', minutes: 55 },
      { day: 'Thu', minutes: 30 },
      { day: 'Fri', minutes: 45 },
      { day: 'Sat', minutes: 60 },
      { day: 'Sun', minutes: 20 },
    ],
  },
];

const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.country.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesGrade = filterGrade === 'all' || user.grade === filterGrade;
    
    return matchesSearch && matchesStatus && matchesGrade;
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
    const total = user.activity.reduce((acc, day) => acc + day.minutes, 0);
    return Math.round(total / user.activity.length);
  };
  
  const totalMinutes = (user: User) => {
    return user.activity.reduce((acc, day) => acc + day.minutes, 0);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage student accounts and their activity
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
                    placeholder="Search users..."
                    className="pl-8 w-full sm:w-[300px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="5th Grade">5th Grade</SelectItem>
                      <SelectItem value="7th Grade">7th Grade</SelectItem>
                      <SelectItem value="8th Grade">8th Grade</SelectItem>
                      <SelectItem value="9th Grade">9th Grade</SelectItem>
                      <SelectItem value="11th Grade">11th Grade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">User</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Grade</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Country</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Last Active</th>
                      <th className="px-4 py-3.5 text-right text-sm font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {currentUsers.map((user) => (
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
                              <AvatarImage src={`https://avatar.vercel.sh/${user.id}`} alt={user.name} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{user.grade}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{user.country}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}>
                            {user.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {user.lastActive.toLocaleDateString()}
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
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit User</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Deactivate Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    
                    {currentUsers.length === 0 && (
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
                      <AvatarImage src={`https://avatar.vercel.sh/${selectedUser.id}`} alt={selectedUser.name} />
                      <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedUser.name}</CardTitle>
                      <CardDescription>{selectedUser.email}</CardDescription>
                    </div>
                  </div>
                  <Badge className={selectedUser.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}>
                    {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full glass">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="progress">Progress</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="pt-4">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Grade</p>
                          <p className="text-sm">{selectedUser.grade}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Country</p>
                          <p className="text-sm">{selectedUser.country}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Joined</p>
                          <p className="text-sm">{selectedUser.joinDate.toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Last Active</p>
                          <p className="text-sm">{selectedUser.lastActive.toLocaleDateString()}</p>
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
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="activity" className="pt-4">
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 border rounded-lg p-3 text-center">
                          <CalendarDays className="h-6 w-6 mx-auto text-blue-500" />
                          <p className="text-sm font-medium">Last Active</p>
                          <p className="text-sm">{selectedUser.lastActive.toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-2 border rounded-lg p-3 text-center">
                          <BarChart className="h-6 w-6 mx-auto text-purple-500" />
                          <p className="text-sm font-medium">Weekly Usage</p>
                          <p className="text-sm">{totalMinutes(selectedUser)} mins</p>
                        </div>
                        <div className="space-y-2 border rounded-lg p-3 text-center">
                          <GraduationCap className="h-6 w-6 mx-auto text-green-500" />
                          <p className="text-sm font-medium">Avg. Grade</p>
                          <p className="text-sm">B+ (85%)</p>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-3">Daily Activity</h3>
                        <div className="space-y-3">
                          {selectedUser.activity.map((day, idx) => (
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
                          {[
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
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="progress" className="pt-4">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium mb-3">Subject Mastery</h3>
                        {selectedUser.subjects.map((subject, idx) => (
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
                      
                      <div>
                        <h3 className="text-sm font-medium mb-3">Learning Recommendations</h3>
                        <div className="space-y-2">
                          <div className="border rounded-md p-3 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                              Focus on English Grammar
                            </p>
                            <p className="text-xs mt-1">
                              Based on recent performance, extra practice with verb tenses recommended.
                            </p>
                          </div>
                          <div className="border rounded-md p-3 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                            <p className="text-sm font-medium text-green-800 dark:text-green-400">
                              Ready for Advanced Math
                            </p>
                            <p className="text-xs mt-1">
                              Excellent algebra skills. Consider introducing pre-calculus concepts.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BarChart className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-center text-muted-foreground">
                  Select a user to view detailed information and statistics
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
