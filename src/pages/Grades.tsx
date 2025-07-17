import React from 'react';
import GradeDashboard from '@/components/user/GradeDashboard';

const Grades = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Grades</h1>
      <GradeDashboard />
    </div>
  );
};

export default Grades;