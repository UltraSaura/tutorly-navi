
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { User as UserType } from '@/types/admin';

interface ProgressTabProps {
  user: UserType;
}

export const ProgressTab = ({ user }: ProgressTabProps) => {
  return (
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
  );
};
