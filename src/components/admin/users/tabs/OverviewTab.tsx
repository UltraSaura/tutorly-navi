import { useLocale } from '@/i18n/useLocale';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

import React from 'react';
import { Mail, Phone, MapPin, Bookmark, PenTool } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { User as UserType } from '@/types/admin';
import { averageMinutes } from '../utils';

interface OverviewTabProps {
  user: UserType;
}

export const OverviewTab = ({ user }: OverviewTabProps) => {
  const { locale, dateLocale } = useLocale();
  const ui = useInterfaceTranslation();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{ui("Email")}</p>
          </div>
          <p className="text-sm pl-6">{user.email}</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{ui("Phone")}</p>
          </div>
          <p className="text-sm pl-6">{user.phone_number || 'Not provided'}</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{ui("Country")}</p>
          </div>
          <p className="text-sm pl-6">{user.country || 'Not provided'}</p>
        </div>

        {user.user_type === 'student' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{ui("Level")}</p>
              </div>
              <p className="text-sm pl-6">{user.level || 'Not specified'}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{ui("Learning Style")}</p>
              </div>
              <p className="text-sm pl-6">{user.style || 'Not specified'}</p>
            </div>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{ui("Joined")}</p>
          <p className="text-sm">
            {new Date(user.created_at).toLocaleDateString(locale)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{ui("Last Updated")}</p>
          <p className="text-sm">
            {new Date(user.updated_at).toLocaleDateString(locale)}
          </p>
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{ui("Weekly Activity")}</h3>
          <p className="text-sm text-muted-foreground">
            {ui("Avg.")} {averageMinutes(user)} {ui("min/day")}
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
          <h3 className="text-sm font-medium">{ui("Subjects Progress")}</h3>
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
  );
};
