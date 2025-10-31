
import React from 'react';
import { CalendarDays, BarChart, GraduationCap, UsersRound } from 'lucide-react';
import { User as UserType } from '@/types/admin';
import { totalMinutes } from '../utils';

interface ActivityTabProps {
  user: UserType;
}

export const ActivityTab = ({ user }: ActivityTabProps) => {
  return (
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
  );
};
