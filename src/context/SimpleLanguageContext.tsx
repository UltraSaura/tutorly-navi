import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: string;
  changeLanguage: (lng: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Comprehensive translation object
const translations = {
  en: {
    // Navigation
    'nav.home': 'Tutor',
    'nav.grades': 'Grades', 
    'nav.roadmap': 'Roadmap',
    'nav.skills': 'Skills',
    'nav.myAccount': 'My Account',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.language': 'Language',
    
    // Languages
    'language.english': 'English',
    'language.french': 'Français',
    
    // Footer
    'footer.copyright': 'StudyWhiz AI. All rights reserved.',
    'footer.subtitle': 'Submit your homework and exercises and get personalized tutoring.',
    'footer.managementDashboard': 'Management Dashboard',
    
    // Chat Interface
    'chat.inputPlaceholder': 'Type your question or homework here...',
    'chat.uploadFile': 'Upload File',
    'chat.takePhoto': 'Take Photo',
    'chat.askQuestions': 'Ask questions or submit your homework for grading',
    'chat.loading': 'AI is thinking...',
    'chat.error': 'Error: Unable to load chat. Please refresh the page.',
    'chat.sendMessage': 'Send Message',
    'chat.typing': 'Type your message...',
    
    // Grades Dashboard
    'grades.title': 'Grade Dashboard',
    'grades.description': 'Track your academic progress and review your exercises',
    'grades.overallGrade': 'Overall Grade',
    'grades.exerciseStats': 'Exercise Statistics',
    'grades.exerciseList': 'Exercise List',
    'grades.exerciseListDescription': 'Review your submitted exercises and their feedback',
    'grades.grade': 'Grade',
    'grades.noGrade': 'Complete exercises to calculate your grade',
    'grades.basedOn': 'Based on {count} completed exercise{plural}',
    'grades.totalExercises': '{total} total exercises • {completed} attempted',
    'grades.correctAnswers': '{correct}/{completed}',
    
    // Exercise Related
    'exercise.correct': 'Correct',
    'exercise.incorrect': 'Incorrect',
    'exercise.pending': 'Pending Review',
    'exercise.feedback': 'Feedback',
    'exercise.answer': 'Your Answer',
    'exercise.question': 'Question',
    'exercise.expand': 'Expand',
    'exercise.collapse': 'Collapse',
    'exercise.noExercises': 'No exercises submitted yet. Start by asking questions or uploading homework!',
    
    // Skills & Roadmap
    'skills.title': 'Skill Mastery',
    'skills.description': 'Track your progress across different subjects and skills',
    'skills.level': 'Level',
    'skills.progress': 'Progress',
    'skills.beginner': 'Beginner',
    'skills.intermediate': 'Intermediate',
    'skills.advanced': 'Advanced',
    'skills.expert': 'Expert',
    
    'roadmap.title': 'Learning Roadmap',
    'roadmap.description': 'Follow your personalized learning path',
    'roadmap.progress': 'Progress',
    'roadmap.complete': 'Complete',
    'roadmap.inProgress': 'In Progress',
    'roadmap.notStarted': 'Not Started',
    
    // Common UI Elements
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.submit': 'Submit',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.clear': 'Clear',
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.upload': 'Upload',
    'common.download': 'Download',
    'common.view': 'View',
    'common.hide': 'Hide',
    'common.show': 'Show',
    'common.more': 'More',
    'common.less': 'Less',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.retry': 'Retry',
    'common.refresh': 'Refresh',
    'common.selectSubject': 'Select a subject',
    
    // File Upload
    'upload.dragDrop': 'Drag and drop files here, or click to select',
    'upload.processing': 'Processing file...',
    'upload.success': 'File uploaded successfully',
    'upload.error': 'Error uploading file',
    'upload.unsupportedFormat': 'Unsupported file format',
    'upload.fileTooLarge': 'File too large',
    
    // Notifications
    'notification.exerciseCreated': 'Exercise created successfully',
    'notification.answerSubmitted': 'Answer submitted for review',
    'notification.gradeUpdated': 'Grade has been updated',
    'notification.settingsSaved': 'Settings saved successfully',
    'notification.languageChanged': 'Language changed to English',
    
    // Time & Dates
    'time.justNow': 'Just now',
    'time.minutesAgo': '{count} minute{plural} ago',
    'time.hoursAgo': '{count} hour{plural} ago',
    'time.daysAgo': '{count} day{plural} ago',
    'time.weeksAgo': '{count} week{plural} ago',
    'time.monthsAgo': '{count} month{plural} ago',
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.tomorrow': 'Tomorrow',

    // Subjects
    'subjects.mathematics': 'Mathematics',
    'subjects.physics': 'Physics',
    'subjects.chemistry': 'Chemistry',
    'subjects.biology': 'Biology',
    'subjects.english': 'English',
    'subjects.french': 'French',
    'subjects.spanish': 'Spanish',
    'subjects.history': 'History',
    'subjects.geography': 'Geography',
    'subjects.computerscience': 'Computer Science'
  },
  fr: {
    // Navigation
    'nav.home': 'Tuteur',
    'nav.grades': 'Notes',
    'nav.roadmap': 'Feuille de route', 
    'nav.skills': 'Compétences',
    'nav.myAccount': 'Mon compte',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'nav.language': 'Langue',
    
    // Languages
    'language.english': 'English',
    'language.french': 'Français',
    
    // Footer
    'footer.copyright': 'StudyWhiz AI. Tous droits réservés.',
    'footer.subtitle': 'Soumettez vos devoirs et exercices et obtenez un tutorat personnalisé.',
    'footer.managementDashboard': 'Tableau de bord de gestion',
    
    // Chat Interface
    'chat.inputPlaceholder': 'Tapez votre question ou devoir ici...',
    'chat.uploadFile': 'Télécharger un fichier',
    'chat.takePhoto': 'Prendre une photo',
    'chat.askQuestions': 'Posez des questions ou soumettez vos devoirs pour correction',
    'chat.loading': 'L\'IA réfléchit...',
    'chat.error': 'Erreur : Impossible de charger le chat. Veuillez actualiser la page.',
    'chat.sendMessage': 'Envoyer le message',
    'chat.typing': 'Tapez votre message...',
    
    // Grades Dashboard
    'grades.title': 'Tableau de bord des notes',
    'grades.description': 'Suivez vos progrès académiques et examinez vos exercices',
    'grades.overallGrade': 'Note globale',
    'grades.exerciseStats': 'Statistiques des exercices',
    'grades.exerciseList': 'Liste des exercices',
    'grades.exerciseListDescription': 'Examinez vos exercices soumis et leurs commentaires',
    'grades.grade': 'Note',
    'grades.noGrade': 'Complétez des exercices pour calculer votre note',
    'grades.basedOn': 'Basé sur {count} exercice{plural} terminé{plural}',
    'grades.totalExercises': '{total} exercices au total • {completed} tentés',
    'grades.correctAnswers': '{correct}/{completed}',
    
    // Exercise Related
    'exercise.correct': 'Correct',
    'exercise.incorrect': 'Incorrect',
    'exercise.pending': 'En attente de révision',
    'exercise.feedback': 'Commentaires',
    'exercise.answer': 'Votre réponse',
    'exercise.question': 'Question',
    'exercise.expand': 'Développer',
    'exercise.collapse': 'Réduire',
    'exercise.noExercises': 'Aucun exercice soumis pour le moment. Commencez par poser des questions ou télécharger des devoirs !',
    
    // Skills & Roadmap
    'skills.title': 'Maîtrise des compétences',
    'skills.description': 'Suivez vos progrès dans différentes matières et compétences',
    'skills.level': 'Niveau',
    'skills.progress': 'Progrès',
    'skills.beginner': 'Débutant',
    'skills.intermediate': 'Intermédiaire',
    'skills.advanced': 'Avancé',
    'skills.expert': 'Expert',
    
    'roadmap.title': 'Feuille de route d\'apprentissage',
    'roadmap.description': 'Suivez votre parcours d\'apprentissage personnalisé',
    'roadmap.progress': 'Progrès',
    'roadmap.complete': 'Terminé',
    'roadmap.inProgress': 'En cours',
    'roadmap.notStarted': 'Pas commencé',
    
    // Common UI Elements
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.close': 'Fermer',
    'common.submit': 'Soumettre',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.clear': 'Effacer',
    'common.add': 'Ajouter',
    'common.remove': 'Supprimer',
    'common.upload': 'Télécharger',
    'common.download': 'Télécharger',
    'common.view': 'Voir',
    'common.hide': 'Masquer',
    'common.show': 'Afficher',
    'common.more': 'Plus',
    'common.less': 'Moins',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.continue': 'Continuer',
    'common.back': 'Retour',
    'common.retry': 'Réessayer',
    'common.refresh': 'Actualiser',
    'common.selectSubject': 'Sélectionner une matière',
    
    // File Upload
    'upload.dragDrop': 'Glissez-déposez les fichiers ici, ou cliquez pour sélectionner',
    'upload.processing': 'Traitement du fichier...',
    'upload.success': 'Fichier téléchargé avec succès',
    'upload.error': 'Erreur lors du téléchargement du fichier',
    'upload.unsupportedFormat': 'Format de fichier non pris en charge',
    'upload.fileTooLarge': 'Fichier trop volumineux',
    
    // Notifications
    'notification.exerciseCreated': 'Exercice créé avec succès',
    'notification.answerSubmitted': 'Réponse soumise pour révision',
    'notification.gradeUpdated': 'La note a été mise à jour',
    'notification.settingsSaved': 'Paramètres enregistrés avec succès',
    'notification.languageChanged': 'Langue changée en français',
    
    // Time & Dates
    'time.justNow': 'À l\'instant',
    'time.minutesAgo': 'Il y a {count} minute{plural}',
    'time.hoursAgo': 'Il y a {count} heure{plural}',
    'time.daysAgo': 'Il y a {count} jour{plural}',
    'time.weeksAgo': 'Il y a {count} semaine{plural}',
    'time.monthsAgo': 'Il y a {count} mois',
    'time.today': 'Aujourd\'hui',
    'time.yesterday': 'Hier',
    'time.tomorrow': 'Demain',

    // Subjects
    'subjects.mathematics': 'Mathématiques',
    'subjects.physics': 'Physique',
    'subjects.chemistry': 'Chimie',
    'subjects.biology': 'Biologie',
    'subjects.english': 'Anglais',
    'subjects.french': 'Français',
    'subjects.spanish': 'Espagnol',
    'subjects.history': 'Histoire',
    'subjects.geography': 'Géographie',
    'subjects.computerscience': 'Informatique'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const changeLanguage = (lng: string) => {
    setLanguage(lng);
    localStorage.setItem('language', lng);
    
    // Show notification about language change
    import('@/components/ui/use-toast').then(({ toast }) => {
      toast({
        title: lng === 'fr' ? 'Langue changée en français' : 'Language changed to English',
        description: lng === 'fr' ? 'L\'interface utilisateur a été changée en français' : 'User interface has been changed to English',
      });
    });
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