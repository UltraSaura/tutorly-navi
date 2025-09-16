import { useState } from 'react';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, CheckCircle, XCircle, TrendingUp, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { MathRenderer } from '@/components/math/MathRenderer';
import { useTwoCardTeaching } from '@/features/explanations/useTwoCardTeaching';
import { ExplanationModal } from '@/features/explanations/ExplanationModal';

export const ExerciseHistoryPage = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const { history, loading, error, stats } = useExerciseHistory({
    limit: 50,
    subject: selectedSubject === 'all' ? undefined : selectedSubject
  });

  const { sections, loading: explanationLoading, open, setOpen, openFor } = useTwoCardTeaching();

  const handleShowExplanation = async (exercise: any) => {
    const profile = {
      response_language: 'English',
      grade_level: 'High School'
    };
    
    await openFor({
      question: exercise.exercise_content,
      userAnswer: exercise.user_answer,
      subjectId: exercise.subject_id
    }, profile);
  };

  const getDateFromPeriod = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  };

  const filteredHistory = history.filter(exercise => {
    const dateFilter = selectedPeriod === 'all' || 
      new Date(exercise.created_at) >= (getDateFromPeriod(selectedPeriod) || new Date(0));
    return dateFilter;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading exercise history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Error loading exercise history: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exercise History</h1>
          <p className="text-muted-foreground">
            Review your past exercises and track your learning progress
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              <SelectItem value="math">Math</SelectItem>
              <SelectItem value="physics">Physics</SelectItem>
              <SelectItem value="chemistry">Chemistry</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <BookOpen className="h-8 w-8 text-primary mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.totalExercises}</p>
              <p className="text-sm text-muted-foreground">Total Exercises</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.correctExercises}</p>
              <p className="text-sm text-muted-foreground">Correct Answers</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.successRate}%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.totalAttempts}</p>
              <p className="text-sm text-muted-foreground">Total Attempts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exercise History List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Exercise Timeline</h2>
        
        {filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No exercises found</h3>
              <p className="text-muted-foreground">
                {selectedSubject !== 'all' || selectedPeriod !== 'all' 
                  ? 'Try adjusting your filters to see more exercises.'
                  : 'Start solving exercises to see your history here.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((exercise) => (
              <Card key={exercise.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2">
                        <MathRenderer latex={exercise.exercise_content} />
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(exercise.created_at), 'MMM d, yyyy HH:mm')}
                        {exercise.subject_id && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              {exercise.subject_id}
                            </Badge>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {exercise.is_correct !== null && (
                        exercise.is_correct ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {exercise.user_answer && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Your answer:</p>
                      <div className="bg-muted p-2 rounded text-sm">
                        <MathRenderer latex={exercise.user_answer} />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{exercise.attempts_count} attempt{exercise.attempts_count !== 1 ? 's' : ''}</span>
                      {exercise.is_correct !== null && (
                        <Badge variant={exercise.is_correct ? 'default' : 'destructive'}>
                          {exercise.is_correct ? 'Correct' : 'Incorrect'}
                        </Badge>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleShowExplanation(exercise)}
                    >
                      View Explanation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Explanation Modal */}
      <ExplanationModal
        open={open}
        onClose={() => setOpen(false)}
        loading={explanationLoading}
        sections={sections}
        error={null}
        onTryAgain={() => setOpen(false)}
      />
    </div>
  );
};

export default ExerciseHistoryPage;