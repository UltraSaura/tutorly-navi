import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/context/SimpleLanguageContext';
import LearningRoadmap from './LearningRoadmap';
import GradeDashboard from './GradeDashboard';
import SkillMastery from './SkillMastery';

const UnifiedDashboard = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.description')}</p>
      </div>

      <Tabs defaultValue="roadmap" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roadmap">{t('dashboard.roadmap')}</TabsTrigger>
          <TabsTrigger value="grades">{t('dashboard.grades')}</TabsTrigger>
          <TabsTrigger value="skills">{t('dashboard.skills')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roadmap" className="mt-6">
          <LearningRoadmap />
        </TabsContent>
        
        <TabsContent value="grades" className="mt-6">
          <GradeDashboard />
        </TabsContent>
        
        <TabsContent value="skills" className="mt-6">
          <SkillMastery />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedDashboard;