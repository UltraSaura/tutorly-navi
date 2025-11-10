
import { useExercises } from '@/hooks/useExercises';
import { BarChart3, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/SimpleLanguageContext';

const GradeDashboard = () => {
  const { exercises, grade } = useExercises();
  const { t } = useLanguage();

  const totalExercises = exercises.length;
  const completedExercises = exercises.filter(ex => ex.isCorrect !== undefined).length;
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('grades.title')}</h1>
        <p className="text-muted-foreground">{t('grades.description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('grades.overallGrade')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{grade.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {t('grades.grade')}: {grade.letter}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {completedExercises === 0 ? 
                t('grades.noGrade') : 
                t('grades.basedOn')
                  .replace('{count}', completedExercises.toString())
                  .replace('{plural}', completedExercises !== 1 ? 's' : '')
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('grades.exerciseStats')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{t('grades.correctAnswers')
              .replace('{correct}', correctExercises.toString())
              .replace('{completed}', completedExercises.toString())}</div>
            <p className="text-xs text-muted-foreground">
              {t('grades.totalExercises')
                .replace('{total}', totalExercises.toString())
                .replace('{completed}', completedExercises.toString())}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('grades.exerciseList')}</CardTitle>
          <CardDescription>
            {t('grades.exerciseListDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {exercises.length === 0 
              ? 'No exercises yet. Start solving problems in the chat!' 
              : `${exercises.length} exercises tracked. View them in the chat interface.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeDashboard;
