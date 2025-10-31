
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Info, Star, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Skill {
  id: string;
  name: string;
  category: string;
  progress: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  lastPracticed: string;
  subskills: {
    name: string;
    progress: number;
  }[];
}

const skills: Skill[] = [
  {
    id: '1',
    name: 'Algebra',
    category: 'math',
    progress: 85,
    level: 'Advanced',
    lastPracticed: '2023-06-12',
    subskills: [
      { name: 'Linear Equations', progress: 95 },
      { name: 'Quadratic Equations', progress: 90 },
      { name: 'Systems of Equations', progress: 80 },
      { name: 'Inequalities', progress: 75 },
    ],
  },
  {
    id: '2',
    name: 'Geometry',
    category: 'math',
    progress: 72,
    level: 'Intermediate',
    lastPracticed: '2023-06-10',
    subskills: [
      { name: 'Angles', progress: 85 },
      { name: 'Triangles', progress: 80 },
      { name: 'Circles', progress: 65 },
      { name: 'Transformations', progress: 60 },
    ],
  },
  {
    id: '3',
    name: 'Grammar',
    category: 'language',
    progress: 90,
    level: 'Expert',
    lastPracticed: '2023-06-14',
    subskills: [
      { name: 'Parts of Speech', progress: 95 },
      { name: 'Sentence Structure', progress: 90 },
      { name: 'Punctuation', progress: 85 },
      { name: 'Verb Tenses', progress: 90 },
    ],
  },
  {
    id: '4',
    name: 'Essay Writing',
    category: 'language',
    progress: 78,
    level: 'Intermediate',
    lastPracticed: '2023-06-08',
    subskills: [
      { name: 'Thesis Development', progress: 75 },
      { name: 'Paragraph Structure', progress: 85 },
      { name: 'Citations', progress: 70 },
      { name: 'Conclusion Writing', progress: 80 },
    ],
  },
  {
    id: '5',
    name: 'Scientific Method',
    category: 'science',
    progress: 68,
    level: 'Intermediate',
    lastPracticed: '2023-06-05',
    subskills: [
      { name: 'Observation', progress: 80 },
      { name: 'Hypothesis Formation', progress: 75 },
      { name: 'Experimentation', progress: 65 },
      { name: 'Data Analysis', progress: 55 },
    ],
  },
  {
    id: '6',
    name: 'Chemistry Fundamentals',
    category: 'science',
    progress: 45,
    level: 'Beginner',
    lastPracticed: '2023-06-02',
    subskills: [
      { name: 'Periodic Table', progress: 60 },
      { name: 'Chemical Bonds', progress: 40 },
      { name: 'Reactions', progress: 35 },
      { name: 'Stoichiometry', progress: 45 },
    ],
  },
  {
    id: '7',
    name: 'World History',
    category: 'history',
    progress: 82,
    level: 'Advanced',
    lastPracticed: '2023-06-11',
    subskills: [
      { name: 'Ancient Civilizations', progress: 90 },
      { name: 'Medieval Period', progress: 85 },
      { name: 'Modern Era', progress: 80 },
      { name: 'Contemporary History', progress: 75 },
    ],
  },
  {
    id: '8',
    name: 'Critical Reading',
    category: 'language',
    progress: 60,
    level: 'Intermediate',
    lastPracticed: '2023-06-07',
    subskills: [
      { name: 'Main Idea Identification', progress: 70 },
      { name: 'Inference Making', progress: 55 },
      { name: "Author's Purpose", progress: 60 },
      { name: 'Text Analysis', progress: 55 },
    ],
  },
];

const SkillMastery = () => {
  const getLevelColor = (level: Skill['level']) => {
    switch (level) {
      case 'Beginner': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Intermediate': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'Advanced': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Expert': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    }
  };
  
  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const SkillCard = ({ skill }: { skill: Skill }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full glass hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{skill.name}</CardTitle>
            <Badge className={`font-normal ${getLevelColor(skill.level)}`}>
              {skill.level}
            </Badge>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Mastery</span>
              <span>{skill.progress}%</span>
            </div>
            <Progress 
              value={skill.progress} 
              className={`h-1.5 ${getProgressColor(skill.progress)}`} 
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Last practiced: {new Date(skill.lastPracticed).toLocaleDateString()}
          </div>
          
          <div className="space-y-3">
            {skill.subskills.map((subskill, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center text-xs mb-1">
                  <div className="flex items-center">
                    <span>{subskill.name}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 ml-1.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            {subskill.progress >= 80 ? 'Excellent understanding!' : 
                             subskill.progress >= 60 ? 'Good progress, keep practicing!' : 
                             'Needs more focus and practice.'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span>{subskill.progress}%</span>
                </div>
                <Progress 
                  value={subskill.progress} 
                  className={`h-1 ${getProgressColor(subskill.progress)}`} 
                />
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button className="inline-flex items-center text-sm text-stuwy-600 dark:text-stuwy-400 hover:underline">
              Practice now <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Skill Mastery Progress</h1>
        <p className="text-muted-foreground">
          Track your skill development and identify areas for improvement.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="glass col-span-full sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Highest Performing Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['Grammar', 'Algebra', 'World History'].map((skillName, idx) => {
                const skill = skills.find(s => s.name === skillName)!;
                return (
                  <div key={idx} className="flex flex-col items-center p-4 rounded-lg bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
                    <div className="mb-3">
                      {idx === 0 ? (
                        <Trophy className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <Star className="h-8 w-8 text-stuwy-500" />
                      )}
                    </div>
                    <h3 className="font-medium text-center">{skill.name}</h3>
                    <div className="mt-2 text-center">
                      <span className="text-2xl font-bold text-stuwy-600">{skill.progress}%</span>
                      <Badge className={`mt-1 block mx-auto font-normal ${getLevelColor(skill.level)}`}>
                        {skill.level}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="glass col-span-full sm:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Recommended Focus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Chemistry Fundamentals', 'Critical Reading'].map((skillName, idx) => {
                const skill = skills.find(s => s.name === skillName)!;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/20">
                      <p className="font-medium text-amber-600 dark:text-amber-400">{skill.progress}%</p>
                    </div>
                    <div>
                      <h3 className="font-medium">{skill.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Needs additional practice</p>
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
                <button className="inline-flex items-center text-sm text-stuwy-600 dark:text-stuwy-400 hover:underline">
                  View personalized study plan <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="math" className="w-full">
        <TabsList className="glass flex flex-wrap justify-center space-x-2 mb-6">
          <TabsTrigger value="all">All Skills</TabsTrigger>
          <TabsTrigger value="math">Mathematics</TabsTrigger>
          <TabsTrigger value="language">Language Arts</TabsTrigger>
          <TabsTrigger value="science">Sciences</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </TabsContent>

        {['math', 'language', 'science', 'history'].map((category) => (
          <TabsContent key={category} value={category} className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {skills
                .filter((skill) => skill.category === category)
                .map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default SkillMastery;
