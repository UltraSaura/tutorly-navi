import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, BookOpen, BarChart3, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import SubjectSelector from './SubjectSelector';

const Navbar = () => {
  const location = useLocation();
  
  const tabs = [
    { path: '/', label: 'Tutor', icon: <MessageSquare className="w-5 h-5" /> },
    { path: '/roadmap', label: 'Roadmap', icon: <BookOpen className="w-5 h-5" /> },
    { path: '/grades', label: 'Grades', icon: <BarChart3 className="w-5 h-5" /> },
    { path: '/skills', label: 'Skills', icon: <CheckSquare className="w-5 h-5" /> },
  ];
  
  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="studywhiz-container">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-studywhiz-600 text-white font-bold">
              SW
            </div>
            <span className="text-lg font-semibold">StudyWhiz</span>
            <div className="hidden md:block">
              <SubjectSelector />
            </div>
          </div>
          
          <nav className="hidden md:flex gap-1 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50">
            {tabs.map((tab) => (
              <Link 
                key={tab.path} 
                to={tab.path}
                className={`nav-item ${location.pathname === tab.path ? 'nav-item-active' : 'nav-item-inactive'}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {location.pathname === tab.path && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 -z-10"
                    transition={{ type: 'spring', duration: 0.3 }}
                  />
                )}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden md:flex">
              My Account
            </Button>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <img 
                src="https://avatars.githubusercontent.com/u/12345678" 
                alt="User avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-2 px-6">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <Link 
              key={tab.path} 
              to={tab.path}
              className={`flex flex-col items-center p-2 rounded-md ${
                location.pathname === tab.path 
                  ? 'text-studywhiz-600 dark:text-studywhiz-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tab.icon}
              <span className="text-xs mt-1">{tab.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
