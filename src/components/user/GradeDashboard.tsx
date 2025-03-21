
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Sample data for charts
const gradeHistory = [
  { month: 'Jan', grade: 72 },
  { month: 'Feb', grade: 78 },
  { month: 'Mar', grade: 75 },
  { month: 'Apr', grade: 82 },
  { month: 'May', grade: 88 },
  { month: 'Jun', grade: 85 }
];

const subjectGrades = [
  { subject: 'Math', grade: 85 },
  { subject: 'Science', grade: 92 },
  { subject: 'English', grade: 78 },
  { subject: 'History', grade: 88 },
  { subject: 'Art', grade: 95 }
];

const skillBreakdown = [
  { name: 'Problem Solving', value: 85 },
  { name: 'Critical Thinking', value: 70 },
  { name: 'Creativity', value: 90 },
  { name: 'Communication', value: 80 }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const GradeDashboard = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Grade Dashboard</h1>
          <p className="text-muted-foreground">
            Track your academic performance across subjects and over time.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select defaultValue="allTime">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="last3Months">Last 3 Months</SelectItem>
              <SelectItem value="last6Months">Last 6 Months</SelectItem>
              <SelectItem value="allTime">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Overall Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-studywhiz-500 to-studywhiz-600 flex items-center justify-center text-white">
                <span className="text-3xl font-semibold">B+</span>
              </div>
            </div>
            <p className="text-center mt-4 text-2xl font-bold text-studywhiz-600">84%</p>
            <p className="text-center text-sm text-muted-foreground">Grade average across all subjects</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Best Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <p className="text-green-600 dark:text-green-400 text-2xl font-semibold">A</p>
              </div>
              <p className="mt-2 text-xl font-medium">Science</p>
              <p className="text-lg text-green-600 dark:text-green-400">92%</p>
              <p className="text-center text-sm text-muted-foreground mt-2">
                4% improvement since last assessment
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Needs Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <p className="text-amber-600 dark:text-amber-400 text-2xl font-semibold">C+</p>
              </div>
              <p className="mt-2 text-xl font-medium">English</p>
              <p className="text-lg text-amber-600 dark:text-amber-400">78%</p>
              <p className="text-center text-sm text-muted-foreground mt-2">
                Focus on grammar and essay structure
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6 glass">
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-0">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Grade Progress Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={gradeHistory}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="grade"
                      name="Grade (%)"
                      stroke="#3a6ff5"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="mt-0">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Performance by Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectGrades}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="grade" name="Grade (%)" fill="#5b8fff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-0">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Skill Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex justify-center">
                <ResponsiveContainer width="100%" height="100%" maxWidth={500}>
                  <PieChart>
                    <Pie
                      data={skillBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {skillBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Math Quiz', date: '2023-06-10', grade: 92, status: 'Excellent' },
                { title: 'History Essay', date: '2023-06-08', grade: 85, status: 'Good' },
                { title: 'Science Lab Report', date: '2023-06-05', grade: 78, status: 'Satisfactory' },
                { title: 'English Book Review', date: '2023-06-01', grade: 88, status: 'Good' },
              ].map((assignment, index) => (
                <div key={index} className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium">{assignment.title}</p>
                    <p className="text-sm text-gray-500">{new Date(assignment.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{assignment.grade}%</p>
                    <p className={`text-sm ${
                      assignment.grade >= 90 ? 'text-green-500' : 
                      assignment.grade >= 80 ? 'text-blue-500' : 
                      assignment.grade >= 70 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {assignment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Improvement Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-700 dark:text-blue-400">English Literature</h3>
                <p className="text-sm mt-1">Focus on analyzing themes and character motivations in your essays.</p>
              </div>
              
              <div className="p-3 border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 rounded-lg">
                <h3 className="font-medium text-amber-700 dark:text-amber-400">Mathematics</h3>
                <p className="text-sm mt-1">Practice more word problems involving algebraic equations.</p>
              </div>
              
              <div className="p-3 border border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-900/20 rounded-lg">
                <h3 className="font-medium text-purple-700 dark:text-purple-400">Study Habits</h3>
                <p className="text-sm mt-1">Create a consistent study schedule with 25-minute focused sessions.</p>
              </div>
              
              <div className="p-3 border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-medium text-green-700 dark:text-green-400">Science</h3>
                <p className="text-sm mt-1">Continue your excellent work. Consider exploring advanced topics.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GradeDashboard;
