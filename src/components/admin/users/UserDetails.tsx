import { User, Mail, Phone, MapPin, BarChart, CalendarDays, GraduationCap, UsersRound, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User as UserType } from '@/types/admin';
import { generateNameFromEmail, averageMinutes, totalMinutes } from './utils';

interface UserDetailsProps {
  user: UserType;
  onAddChildClick: () => void;
  onUserSelect: (user: UserType) => void;
}

export const UserDetails = ({ user, onAddChildClick, onUserSelect }: UserDetailsProps) => {
  const getUserTypeIcon = (userType: 'student' | 'parent') => {
    return userType === 'student' ? (
      <GraduationCap className="h-4 w-4 text-blue-500" />
    ) : (
      <UsersRound className="h-4 w-4 text-purple-500" />
    );
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
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
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {getUserTypeIcon(user.user_type)}
              <span className="capitalize">{user.user_type}</span>
            </Badge>
          </div>
        </div>
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Email</p>
                  </div>
                  <p className="text-sm pl-6">{user.email}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Phone</p>
                  </div>
                  <p className="text-sm pl-6">{user.phone_number || 'Not provided'}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Country</p>
                  </div>
                  <p className="text-sm pl-6">{user.country || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Joined</p>
                  <p className="text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm">
                    {new Date(user.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Weekly Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    Avg. {averageMinutes(user)} min/day
                  </p>
                </div>
                <div className="h-[120px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={user.activity}>
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
              
              {user.user_type === 'student' && user.subjects && user.subjects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Subjects Progress</h3>
                  {user.subjects.map((subject, idx) => (
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
                    {new Date(user.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2 border rounded-lg p-3 text-center">
                  <BarChart className="h-6 w-6 mx-auto text-purple-500" />
                  <p className="text-sm font-medium">Weekly Usage</p>
                  <p className="text-sm">{totalMinutes(user)} mins</p>
                </div>
                {user.user_type === 'student' ? (
                  <div className="space-y-2 border rounded-lg p-3 text-center">
                    <GraduationCap className="h-6 w-6 mx-auto text-green-500" />
                    <p className="text-sm font-medium">Avg. Grade</p>
                    <p className="text-sm">B+ (85%)</p>
                  </div>
                ) : (
                  <div className="space-y-2 border rounded-lg p-3 text-center">
                    <UsersRound className="h-6 w-6 mx-auto text-green-500" />
                    <p className="text-sm font-medium">Children</p>
                    <p className="text-sm">{user.children?.length || 0}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-3">Daily Activity</h3>
                <div className="space-y-3">
                  {user.activity?.map((day, idx) => (
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
                  {user.user_type === 'student' ? (
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
          
          {user.user_type === 'student' && (
            <TabsContent value="progress" className="pt-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Subject Mastery</h3>
                  {user.subjects?.map((subject, idx) => (
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
          
          {user.user_type === 'parent' && (
            <TabsContent value="children" className="pt-4">
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
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
