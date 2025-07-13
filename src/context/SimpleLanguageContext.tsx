import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: string;
  changeLanguage: (lng: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple translation object
const translations = {
  en: {
    'nav.home': 'Tutor',
    'nav.grades': 'Grades', 
    'nav.roadmap': 'Roadmap',
    'nav.skills': 'Skills',
    'nav.myAccount': 'My Account',
    'nav.language': 'Language',
    'language.english': 'English',
    'language.french': 'Français',
    'footer.copyright': 'StudyWhiz AI. All rights reserved.',
    'footer.subtitle': 'Submit your homework and exercises and get personalized tutoring.',
    'footer.managementDashboard': 'Management Dashboard',
    'chat.inputPlaceholder': 'Type your question or homework here...',
    'chat.uploadFile': 'Upload File',
    'chat.takePhoto': 'Take Photo',
    'chat.askQuestions': 'Ask questions or submit your homework for grading',
    'chat.loading': 'AI is thinking...'
  },
  fr: {
    'nav.home': 'Tuteur',
    'nav.grades': 'Notes',
    'nav.roadmap': 'Feuille de route', 
    'nav.skills': 'Compétences',
    'nav.myAccount': 'Mon compte',
    'nav.language': 'Langue',
    'language.english': 'English',
    'language.french': 'Français',
    'footer.copyright': 'StudyWhiz AI. Tous droits réservés.',
    'footer.subtitle': 'Soumettez vos devoirs et exercices et obtenez un tutorat personnalisé.',
    'footer.managementDashboard': 'Tableau de bord de gestion',
    'chat.inputPlaceholder': 'Tapez votre question ou devoir ici...',
    'chat.uploadFile': 'Télécharger un fichier',
    'chat.takePhoto': 'Prendre une photo',
    'chat.askQuestions': 'Posez des questions ou soumettez vos devoirs pour correction',
    'chat.loading': 'L\'IA réfléchit...'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const changeLanguage = (lng: string) => {
    setLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const t = (key: string): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.en;
    return currentTranslations[key as keyof typeof currentTranslations] || key;
  };

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      t
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if context is not available
    return {
      language: 'en',
      changeLanguage: () => {},
      t: (key: string) => key
    };
  }
  return context;
};