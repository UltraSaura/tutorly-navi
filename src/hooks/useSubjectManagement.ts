import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Subject } from '@/types/admin';

// Canonical French subjects — must match slugs in the subjects DB table.
const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'mathematiques',          name: 'Mathématiques',              active: true,  icon: 'calculator', category: 'Sciences', order: 0 },
  { id: 'francais',               name: 'Français',                   active: true,  icon: 'book-open',  category: 'Langues',  order: 1 },
  { id: 'sciences',               name: 'Sciences',                   active: true,  icon: 'atom',       category: 'Sciences', order: 2 },
  { id: 'histoire',               name: 'Histoire',                   active: true,  icon: 'landmark',   category: 'SHS',      order: 3 },
  { id: 'geographie',             name: 'Géographie',                 active: true,  icon: 'globe',      category: 'SHS',      order: 4 },
  { id: 'emc',                    name: 'Éducation Morale et Civique',active: true,  icon: 'scale',      category: 'SHS',      order: 5 },
];

// Old English subject ids that were shipped in earlier versions — clear stale localStorage.
const LEGACY_ENGLISH_IDS = new Set(['math','physics','chemistry','biology','english','history','geography','french','spanish','computer-science']);

function loadOrMigrateSubjects(): Subject[] {
  try {
    const raw = localStorage.getItem('subjects');
    if (!raw) return DEFAULT_SUBJECTS;
    const saved: Subject[] = JSON.parse(raw);
    // If the saved list still contains legacy English subjects, reset to French defaults.
    if (saved.some(s => LEGACY_ENGLISH_IDS.has(s.id))) {
      localStorage.removeItem('subjects');
      return DEFAULT_SUBJECTS;
    }
    return saved;
  } catch {
    return DEFAULT_SUBJECTS;
  }
}

export const useSubjectManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>(loadOrMigrateSubjects);

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