import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Subject } from '@/types/admin';

// Default subjects
const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'math', name: 'Mathematics', active: true, icon: 'calculator', category: 'STEM', order: 0 },
  { id: 'physics', name: 'Physics', active: true, icon: 'atom', category: 'STEM', order: 1 },
  { id: 'chemistry', name: 'Chemistry', active: true, icon: 'flask-conical', category: 'STEM', order: 2 },
  { id: 'biology', name: 'Biology', active: true, icon: 'dna', category: 'STEM', order: 3 },
  { id: 'english', name: 'English', active: true, icon: 'book-open', category: 'Languages', order: 0 },
  { id: 'history', name: 'History', active: true, icon: 'landmark', category: 'Humanities', order: 0 },
  { id: 'geography', name: 'Geography', active: true, icon: 'globe', category: 'Humanities', order: 1 },
  { id: 'french', name: 'French', active: true, icon: 'languages', category: 'Languages', order: 1 },
  { id: 'spanish', name: 'Spanish', active: true, icon: 'languages', category: 'Languages', order: 2 },
  { id: 'computer-science', name: 'Computer Science', active: true, icon: 'code', category: 'STEM', order: 4 }
];

export const useSubjectManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const savedSubjects = localStorage.getItem('subjects');
    return savedSubjects ? JSON.parse(savedSubjects) : DEFAULT_SUBJECTS;
  });

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(() => {
    const savedSubject = localStorage.getItem('selectedSubject');
    return savedSubject ? JSON.parse(savedSubject) : null;
  });

  // Save subjects to localStorage when they change
  useEffect(() => {
    localStorage.setItem('subjects', JSON.stringify(subjects));
  }, [subjects]);

  // Save selected subject to localStorage when it changes
  useEffect(() => {
    if (selectedSubject) {
      localStorage.setItem('selectedSubject', JSON.stringify(selectedSubject));
    }
  }, [selectedSubject]);

  const addSubject = (subject: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...subject,
      id: subject.name.toLowerCase().replace(/\s+/g, '-'),
    };
    
    setSubjects([...subjects, newSubject]);
    toast.success(`Subject ${subject.name} added successfully`);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(subjects.map(subject => 
      subject.id === id ? { ...subject, ...updates } : subject
    ));
    toast.success(`Subject updated successfully`);
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(subject => subject.id !== id));
    toast.success(`Subject deleted successfully`);
  };

  const toggleSubjectActive = (id: string) => {
    setSubjects(subjects.map(subject => 
      subject.id === id ? { ...subject, active: !subject.active } : subject
    ));
    
    const subject = subjects.find(s => s.id === id);
    if (subject) {
      toast.success(`${subject.name} is now ${!subject.active ? 'active' : 'inactive'}`);
    }
  };

  const getActiveSubjects = () => {
    return subjects.filter(subject => subject.active);
  };

  return {
    subjects,
    selectedSubject,
    setSelectedSubject,
    addSubject,
    updateSubject,
    deleteSubject,
    toggleSubjectActive,
    getActiveSubjects
  };
};