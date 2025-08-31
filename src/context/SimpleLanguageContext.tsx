import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLanguageFromCountry } from '@/utils/countryLanguageMapping';
import { useAuth } from '@/context/AuthContext';
import { useCountryDetection } from '@/hooks/useCountryDetection';

export const defaultLang = "en";

interface LanguageContextType {
  language: string;
  changeLanguage: (lng: string) => void;
  setLanguageFromCountry: (countryCode: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Nested translation object with legacy key support
const translations = {
  en: {
    // New nested structure
    app: {
      title: "Tutorly Navi",
      loading: "Loading…",
      retry: "Retry",
      cancel: "Cancel",
    },
    nav: { tutor: "Tutor", homework: "Homework", progress: "Progress", rewards: "Rewards" },
    chat: {
      placeholder: "Type your question or homework here…",
      attach: "Attach",
      send: "Send",
      upload_doc: "Upload document",
      upload_photo: "Upload photo",
      take_photo: "Take a photo",
    },
    exercises: {
      list_title: "Exercise List",
      header_grade: "Overall Grade",
      summary: "{correct}/{total} correct",
      empty_title: "No exercises submitted yet",
      empty_sub: "Start by asking questions or uploading homework!",
      show_explanation: "Show explanation",
      try_again: "Try again → +{xp} XP",
    },
    explanation: {
      modal_title: "Explanation",
      fallback: {
        exercise: "This is your exercise. Try to restate it in your own words.",
        concept: "We'll focus on the exact math idea you need here.",
        example: "Here's a similar example with different numbers.",
        strategy: "1) Understand the goal  2) Apply the rules  3) Check your result.",
        pitfall: "Avoid applying an operation to only one part.",
        check: "Explain why each step is valid.",
        practice: "Practice a few similar problems and explain your steps aloud.",
      },
      headers: {
        exercise: "📘 Exercise",
        concept: "💡 Concept",
        example: "🔍 Example (different numbers)",
        strategy: "☑️ Strategy",
        pitfall: "⚠️ Pitfall",
        check: "🎯 Check yourself",
        practice: "📈 Practice Tip",
      },
    },
    badges: {
      streak: "Day {n} Streak!",
      xp_gain: "+{xp} XP",
      level: "Level {n}",
    },
    
    // Legacy flat keys for backward compatibility
    'nav.home': 'Tutor',
    'nav.grades': 'Grades', 
    'nav.roadmap': 'Roadmap',
    'nav.skills': 'Skills',
    'nav.myAccount': 'My Account',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.language': 'Language',
    'language.english': 'English',
    'language.french': 'Français',
    'language.autoDetected': 'Auto-detected based on country',
    'language.auto': 'Auto',
    'exercise.tryAgain': 'Try again',
    'exercise.showExplanation': 'Show explanation',
    'exercise.hideExplanation': 'Hide explanation',
    'exercise.greatWork': 'Great work!',
    'exercise.learningOpportunity': 'Learning Opportunity',
    'exercise.attempt': 'Attempt',
    'exercise.exerciseList': 'Exercise List',
    'exercise.problem': 'Problem',
    'exercise.guidance': 'Guidance',
    'exercise.pleaseProvideAnswer': 'Please provide an answer',
    'exercise.answerSubmitted': 'Answer submitted successfully',
    'exercise.correct': 'Correct',
    'exercise.incorrect': 'Incorrect',
    'exercise.pending': 'Pending Review',
    'exercise.feedback': 'Feedback',
    'exercise.answer': 'Your Answer',
    'exercise.question': 'Question',
    'exercise.expand': 'Expand',
    'exercise.collapse': 'Collapse',
    'exercise.noExercises': 'No exercises submitted yet. Start by asking questions or uploading homework!',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.submit': 'Submit',
    'common.retry': 'Retry',
    'common.selectSubject': 'Select a subject',
    'chat.inputPlaceholder': 'Type your question or homework here...',
    'chat.uploadFile': 'Upload File',
    'chat.takePhoto': 'Take Photo',
    'chat.loading': 'AI is thinking...',
    'chat.sendMessage': 'Send Message',
    'auth.signIn': 'Sign In',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.parentRegistration': 'Parent Registration',
    'auth.parentInformation': 'Parent Information',
    'explanation.fallback.exercise': 'This is your exercise. Try to restate it in your own words.',
    'explanation.fallback.concept': 'We\'ll focus on the exact math idea you need here.',
    'explanation.fallback.example': 'Here\'s a similar example with different numbers.',
    'explanation.fallback.strategy': '1) Understand the goal  2) Apply the rules  3) Check your result.',
    'explanation.fallback.pitfall': 'Avoid applying an operation to only one part.',
    'explanation.fallback.check': 'Explain why each step is valid.',
    'explanation.fallback.practice': 'Practice a few similar problems and explain your steps aloud.',
    'explanation.error': 'Error loading explanation. Please try again.'
  },
  fr: {
    // New nested structure
    app: { title: "Tutorly Navi", loading: "Chargement…", retry: "Réessayer", cancel: "Annuler" },
    nav: { tutor: "Tuteur", homework: "Devoirs", progress: "Progrès", rewards: "Récompenses" },
    chat: {
      placeholder: "Saisissez votre question ou devoir…",
      attach: "Joindre",
      send: "Envoyer",
      upload_doc: "Importer un document",
      upload_photo: "Importer une photo",
      take_photo: "Prendre une photo",
    },
    exercises: {
      list_title: "Liste d'exercices",
      header_grade: "Note globale",
      summary: "{correct}/{total} correct",
      empty_title: "Aucun exercice soumis",
      empty_sub: "Commencez par poser une question ou téléverser un devoir !",
      show_explanation: "Afficher l'explication",
      try_again: "Réessayer → +{xp} XP",
    },
    explanation: {
      modal_title: "Afficher l'explication",
      fallback: {
        exercise: "Voici votre exercice. Reformulez-le avec vos propres mots.",
        concept: "Concentrons-nous sur l'idée mathématique essentielle.",
        example: "Voici un exemple semblable avec d'autres nombres.",
        strategy: "1) Comprendre l'objectif  2) Appliquer les règles  3) Vérifier le résultat.",
        pitfall: "N'appliquez jamais une opération à une seule partie.",
        check: "Expliquez pourquoi chaque étape est valide.",
        practice: "Entraînez-vous avec des exercices similaires en expliquant vos étapes.",
      },
      headers: {
        exercise: "📘 Exercice",
        concept: "💡 Concept",
        example: "🔍 Exemple (autres nombres)",
        strategy: "☑️ Stratégie",
        pitfall: "⚠️ Piège",
        check: "🎯 Auto-vérification",
        practice: "📈 Astuce de pratique",
      },
    },
    badges: { streak: "Série de {n} jours !", xp_gain: "+{xp} XP", level: "Niveau {n}" },
    
    // Legacy flat keys for backward compatibility
    'nav.home': 'Tuteur',
    'nav.grades': 'Notes',
    'nav.roadmap': 'Suivi', 
    'nav.skills': 'Compétences',
    'nav.myAccount': 'Mon compte',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'nav.language': 'Langue',
    'language.english': 'English',
    'language.french': 'Français',
    'language.autoDetected': 'Détection automatique selon le pays',
    'language.auto': 'Auto',
    'exercise.tryAgain': 'Réessayer',
    'exercise.showExplanation': 'Afficher l\'explication',
    'exercise.hideExplanation': 'Masquer l\'explication',
    'exercise.greatWork': 'Excellent travail !',
    'exercise.learningOpportunity': 'Opportunité d\'apprentissage',
    'exercise.attempt': 'Tentative',
    'exercise.exerciseList': 'Liste des exercices',
    'exercise.problem': 'Problème',
    'exercise.guidance': 'Guide',
    'exercise.pleaseProvideAnswer': 'Veuillez fournir une réponse',
    'exercise.answerSubmitted': 'Réponse soumise avec succès',
    'exercise.correct': 'Correct',
    'exercise.incorrect': 'Incorrect',
    'exercise.pending': 'En attente de révision',
    'exercise.feedback': 'Commentaires',
    'exercise.answer': 'Votre réponse',
    'exercise.question': 'Question',
    'exercise.expand': 'Développer',
    'exercise.collapse': 'Réduire',
    'exercise.noExercises': 'Aucun exercice soumis pour le moment. Commencez par poser des questions ou télécharger des devoirs !',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.close': 'Fermer',
    'common.submit': 'Soumettre',
    'common.retry': 'Réessayer',
    'common.selectSubject': 'Sélectionner une matière',
    'chat.inputPlaceholder': 'Tapez votre question ou devoir ici...',
    'chat.uploadFile': 'Télécharger un fichier',
    'chat.takePhoto': 'Prendre une photo',
    'chat.loading': 'L\'IA réfléchit...',
    'chat.sendMessage': 'Envoyer le message',
    'auth.signIn': 'Se connecter',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.parentRegistration': 'Inscription des parents',
    'auth.parentInformation': 'Informations sur les parents',
    'explanation.fallback.exercise': 'Voici votre exercice. Reformulez-le avec vos propres mots.',
    'explanation.fallback.concept': 'Concentrons-nous sur l\'idée mathématique essentielle.',
    'explanation.fallback.example': 'Voici un exemple semblable avec d\'autres nombres.',
    'explanation.fallback.strategy': '1) Comprendre l\'objectif  2) Appliquer les règles  3) Vérifier le résultat.',
    'explanation.fallback.pitfall': 'N\'appliquez jamais une opération à une seule partie.',
    'explanation.fallback.check': 'Expliquez pourquoi chaque étape est valide.',
    'explanation.fallback.practice': 'Entraînez-vous avec quelques exercices similaires en expliquant vos étapes.',
    'explanation.error': 'Erreur lors du chargement de l\'explication. Veuillez réessayer.'
  },
} as const;

export const SimpleLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('lang') || defaultLang;
  });
  
  const { user } = useAuth();
  const { detection, getLanguageFromDetection } = useCountryDetection();

  const changeLanguage = (lng: string) => {
    setLanguage(lng);
    localStorage.setItem('lang', lng);
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
      localStorage.setItem('lang', detectedLanguage);
      
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

  const t = (key: string, params?: Record<string, string | number>): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations[defaultLang];
    
    // Navigate through nested object using dot notation
    const keys = key.split('.');
    let value: any = currentTranslations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    // Fallback to key if translation not found
    let result = value || key;
    
    // Handle interpolation if params provided
    if (params && typeof result === 'string') {
      result = result.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }
    
    return result;
  };

  // Auto-detect language from multiple sources when user loads
  useEffect(() => {
    const detectLanguageFromUser = async () => {
      const languageManuallySet = localStorage.getItem('languageManuallySet') === 'true';
      if (languageManuallySet) return;
      
      let detectedLanguage = null;
      
      // First try user profile country
      if (user?.id) {
        try {
          const { data } = await import('@/integrations/supabase/client').then(m => 
            m.supabase
              .from('users')
              .select('country')
              .eq('id', user.id)
              .single()
          );
          
          if (data?.country) {
            console.log('User loaded with country:', data.country);
            detectedLanguage = getLanguageFromCountry(data.country);
          }
        } catch (error) {
          console.warn('Failed to detect language from user profile:', error);
        }
      }
      
      // Fallback to automatic country detection
      if (!detectedLanguage && detection.country) {
        detectedLanguage = getLanguageFromDetection();
        console.log('Using automatic detection:', detection.country, '->', detectedLanguage);
      }
      
      if (detectedLanguage && detectedLanguage !== language) {
        console.log('Changing language from', language, 'to', detectedLanguage);
        setLanguage(detectedLanguage);
        localStorage.setItem('lang', detectedLanguage);
        
        const methodText = detection.method === 'geolocation' ? 'location' :
                          detection.method === 'ip' ? 'IP address' :
                          detection.method === 'timezone' ? 'timezone' : 'profile';
        
        // Show notification about automatic language change
        import('@/components/ui/use-toast').then(({ toast }) => {
          toast({
            title: detectedLanguage === 'fr' ? 'Langue automatiquement définie en français' : 'Language automatically set to English',
            description: detectedLanguage === 'fr' ? `Basé sur votre ${methodText}` : `Based on your ${methodText}`,
          });
        });
      }
    };
    
    detectLanguageFromUser();
  }, [user?.id, detection.country, detection.method, language, getLanguageFromDetection]);

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
      language: defaultLang,
      changeLanguage: () => {},
      setLanguageFromCountry: () => {},
      t: (key: string, params?: Record<string, string | number>) => key
    };
  }
  return context;
};