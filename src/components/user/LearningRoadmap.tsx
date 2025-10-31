
import { motion } from 'framer-motion';
import { ChevronRight, Check, Clock, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useTranslation } from 'react-i18next';

interface Topic {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'completed' | 'in-progress' | 'upcoming';
  subtopics: { name: string; completed: boolean }[];
}

const topics: Topic[] = [
  {
    id: '1',
    title: 'Algebra Fundamentals',
    description: 'Master the basic concepts of algebra including equations, inequalities, and functions',
    progress: 100,
    status: 'completed',
    subtopics: [
      { name: 'Linear Equations', completed: true },
      { name: 'Quadratic Equations', completed: true },
      { name: 'Systems of Equations', completed: true },
    ],
  },
  {
    id: '2',
    title: 'Geometry and Trigonometry',
    description: 'Learn shapes, angles, triangles, and trigonometric functions',
    progress: 65,
    status: 'in-progress',
    subtopics: [
      { name: 'Euclidean Geometry', completed: true },
      { name: 'Trigonometric Functions', completed: true },
      { name: 'Circles and Ellipses', completed: false },
      { name: 'Vectors and Transformations', completed: false },
    ],
  },
  {
    id: '3',
    title: 'Calculus Foundations',
    description: 'Introduction to limits, derivatives, and integrals',
    progress: 30,
    status: 'in-progress',
    subtopics: [
      { name: 'Limits and Continuity', completed: true },
      { name: 'Derivatives', completed: false },
      { name: 'Integrals', completed: false },
      { name: 'Applications of Calculus', completed: false },
    ],
  },
  {
    id: '4',
    title: 'Statistics and Probability',
    description: 'Analyze data, understand randomness, and make predictions',
    progress: 0,
    status: 'upcoming',
    subtopics: [
      { name: 'Descriptive Statistics', completed: false },
      { name: 'Probability Theory', completed: false },
      { name: 'Statistical Inference', completed: false },
      { name: 'Regression Analysis', completed: false },
    ],
  },
];

const LearningRoadmap = () => {
  const { t } = useTranslation();
  const getStatusIcon = (status: Topic['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'upcoming':
        return <Star className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: Topic['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-amber-500';
      case 'upcoming':
        return 'bg-blue-500';
    }
  };

  const getStatusText = (status: Topic['status']) => {
    switch (status) {
      case 'completed':
        return t('roadmap.complete');
      case 'in-progress':
        return t('roadmap.inProgress');
      case 'upcoming':
        return t('roadmap.notStarted');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('roadmap.title')}</h1>
        <p className="text-muted-foreground">
          {t('roadmap.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="col-span-full md:col-span-2 glass">
          <CardHeader className="pb-2">
            <CardTitle>{t('roadmap.progress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Math Mastery</span>
                  <span className="text-sm">48%</span>
                </div>
                <Progress value={48} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Science Understanding</span>
                  <span className="text-sm">62%</span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Language Arts</span>
                  <span className="text-sm">75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full md:col-span-1 glass">
          <CardHeader className="pb-2">
            <CardTitle>Learning Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <Badge className="bg-stuwy-500 hover:bg-stuwy-600 mr-1">14 Skills Mastered</Badge>
              <Badge className="bg-green-500 hover:bg-green-600 mr-1">3 Topics Completed</Badge>
              <Badge className="bg-amber-500 hover:bg-amber-600">
                5 {t('game.dayStreak')}
              </Badge>
              
              <div className="flex justify-between items-center mt-4">
                <span className="font-medium">Next Achievement:</span>
                <span>10 {t('game.dayStreak')}</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Math Track</h2>
        
        <div className="relative flex flex-col">
          {/* Connecting line */}
          <div className="absolute left-4 top-10 bottom-10 w-0.5 bg-gray-200 dark:bg-gray-700 z-0"></div>
          
          {topics.map((topic, index) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative z-10 mb-6 last:mb-0"
            >
              <div className={`flex items-start gap-4`}>
                <div className={`rounded-full p-2 ${getStatusColor(topic.status)} text-white shrink-0`}>
                  {getStatusIcon(topic.status)}
                </div>
                
                <div className="flex-1 glass rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-semibold">{topic.title}</h3>
                    <Badge variant="outline" className="font-normal">
                      {getStatusText(topic.status)}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t('roadmap.progress')}</span>
                      <span>{topic.progress}%</span>
                    </div>
                    <Progress value={topic.progress} className="h-1.5" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {topic.subtopics.map((subtopic, idx) => (
                      <div 
                        key={idx} 
                        className={`text-xs px-3 py-2 rounded-md flex items-center gap-1.5 ${
                          subtopic.completed 
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {subtopic.completed && <Check className="w-3 h-3" />}
                        {subtopic.name}
                      </div>
                    ))}
                  </div>
                  
                  {topic.status !== 'completed' && (
                    <div className="mt-4 flex justify-end">
                      <button className="inline-flex items-center text-sm text-stuwy-600 dark:text-stuwy-400 hover:underline">
                        Continue learning <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LearningRoadmap;
