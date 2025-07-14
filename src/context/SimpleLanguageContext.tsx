import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLanguageFromCountry } from '@/utils/countryLanguageMapping';

interface LanguageContextType {
  language: string;
  changeLanguage: (lng: string) => void;
  setLanguageFromCountry: (countryCode: string) => void;
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
    'language.autoDetected': 'Auto-detected based on country',
    'language.auto': 'Auto',
    
    // Exercise Component
    'exercise.tryAgain': 'Try again',
    'exercise.showExplanation': 'Show explanation',
    'exercise.hideExplanation': 'Hide explanation',
    'exercise.greatWork': 'Great work!',
    'exercise.learningOpportunity': 'Learning Opportunity',
    'exercise.attempt': 'Attempt',

    // File Upload Messages
    'upload.fileTooLarge': 'File too large',
    'upload.maxFileSize': 'Maximum file size is 10MB.',
    'upload.invalidFileType': 'Invalid file type',
    'upload.imageFileError': 'Please upload an image file (jpg, png, etc.)',
    'upload.documentFileError': 'Please upload a PDF, Word document, or text file.',
    'upload.photoUploaded': 'Photo uploaded',
    'upload.photoSuccess': 'Your photo has been uploaded and will be processed as homework.',
    'upload.documentUploaded': 'Document uploaded',
    'upload.documentSuccess': 'has been uploaded and will be processed as homework.',

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
    'chat.history': 'Chat History',
    'chat.conversationHistory': 'Conversation History',
    'chat.welcomeMessage': "👋 Hi there! I'm your StudyWhiz AI tutor. How can I help you today? You can ask me questions, upload homework, or submit exercises for me to help you with.",
    
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
    
    // Notifications
    'notification.exerciseCreated': 'Exercise created successfully',
    'notification.answerSubmitted': 'Answer submitted for review',
    'notification.gradeUpdated': 'Grade has been updated',
    'notification.settingsSaved': 'Settings saved successfully',
    'notification.languageChanged': 'Language changed to English',
    'notification.languageAutoChanged': 'Language automatically set to English based on your country',
    
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
    'language.autoDetected': 'Détection automatique selon le pays',
    'language.auto': 'Auto',
    
    // Exercise Component
    'exercise.tryAgain': 'Réessayer',
    'exercise.showExplanation': 'Afficher l\'explication',
    'exercise.hideExplanation': 'Masquer l\'explication',
    'exercise.greatWork': 'Excellent travail !',
    'exercise.learningOpportunity': 'Opportunité d\'apprentissage',
    'exercise.attempt': 'Tentative',

    // File Upload Messages
    'upload.fileTooLarge': 'Fichier trop volumineux',
    'upload.maxFileSize': 'La taille maximale du fichier est de 10 Mo.',
    'upload.invalidFileType': 'Type de fichier invalide',
    'upload.imageFileError': 'Veuillez télécharger un fichier image (jpg, png, etc.)',
    'upload.documentFileError': 'Veuillez télécharger un PDF, un document Word ou un fichier texte.',
    'upload.photoUploaded': 'Photo téléchargée',
    'upload.photoSuccess': 'Votre photo a été téléchargée et sera traitée comme devoir.',
    'upload.documentUploaded': 'Document téléchargé',
    'upload.documentSuccess': 'a été téléchargé et sera traité comme devoir.',

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
    'chat.history': 'Historique du chat',
    'chat.conversationHistory': 'Historique de conversation',
    'chat.welcomeMessage': "👋 Salut ! Je suis votre tuteur IA StudyWhiz. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions, télécharger des devoirs ou soumettre des exercices pour que je vous aide.",
    
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
    
    // Notifications
    'notification.exerciseCreated': 'Exercice créé avec succès',
    'notification.answerSubmitted': 'Réponse soumise pour révision',
    'notification.gradeUpdated': 'La note a été mise à jour',
    'notification.settingsSaved': 'Paramètres enregistrés avec succès',
    'notification.languageChanged': 'Langue changée en français',
    'notification.languageAutoChanged': 'Langue automatiquement définie en français selon votre pays',
    
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
    localStorage.setItem('languageManuallySet', 'true');
    
    // Show notification about language change
    import('@/components/ui/use-toast').then(({ toast }) => {
      toast({
        title: lng === 'fr' ? 'Langue changée en français' : 'Language changed to English',
        description: lng === 'fr' ? 'L\'interface utilisateur a été changée en français' : 'User interface has been changed to English',
      });
    });
  };

  const setLanguageFromCountry = (countryCode: string) => {
    // Only auto-set language if user hasn't manually changed it
    const manuallySet = localStorage.getItem('languageManuallySet');
    
    console.log('setLanguageFromCountry called with:', countryCode);
    console.log('manuallySet flag:', manuallySet);
    console.log('current language:', language);
    
    if (manuallySet === 'true') {
      console.log('Language was manually set, not changing automatically');
      return; // User has manually set language, don't override
    }

    const detectedLanguage = getLanguageFromCountry(countryCode);
    console.log('detected language from country:', detectedLanguage);
    
    if (detectedLanguage !== language) {
      console.log('Changing language from', language, 'to', detectedLanguage);
      setLanguage(detectedLanguage);
      localStorage.setItem('language', detectedLanguage);
      
      // Show notification about automatic language change
      import('@/components/ui/use-toast').then(({ toast }) => {
        toast({
          title: detectedLanguage === 'fr' ? 'Langue automatiquement définie en français' : 'Language automatically set to English',
          description: detectedLanguage === 'fr' ? 'Basé sur votre pays sélectionné' : 'Based on your selected country',
        });
      });
    } else {
      console.log('Language already matches detected language');
    }
  };

  const t = (key: string): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.en;
    return currentTranslations[key as keyof typeof currentTranslations] || key;
  };

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      setLanguageFromCountry,
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
      setLanguageFromCountry: () => {},
      t: (key: string) => key
    };
  }
  return context;
};