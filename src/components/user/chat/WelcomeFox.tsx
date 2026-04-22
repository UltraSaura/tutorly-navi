import { motion } from 'framer-motion';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/SimpleLanguageContext';

const FOX_ORANGE = '#F97316';
const FOX_ORANGE_DARK = '#EA580C';
const FOX_CREAM = '#FFF7ED';
const FOX_DARK = '#1E293B';

const FoxMascot = () => {
  return (
    <div className="relative w-44 h-44 md:w-52 md:h-52 flex-shrink-0">
      {/* Sparkle accent */}
      <motion.svg
        className="absolute -top-2 -right-2 w-8 h-8"
        viewBox="0 0 24 24"
        initial={{ scale: 0.8, opacity: 0.4 }}
        animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <path
          d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"
          fill={FOX_ORANGE}
          opacity="0.85"
        />
      </motion.svg>

      {/* Floating/breathing fox */}
      <motion.div
        className="w-full h-full"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Friendly fox mascot">
          {/* Soft shadow under fox */}
          <ellipse cx="100" cy="180" rx="55" ry="6" fill={FOX_DARK} opacity="0.08" />

          {/* Tail */}
          <path
            d="M40 130 Q15 110 25 80 Q35 95 50 105 Q60 115 55 135 Z"
            fill={FOX_ORANGE}
            stroke={FOX_ORANGE_DARK}
            strokeWidth="1.5"
          />
          <path
            d="M28 88 Q22 95 26 105 Q34 102 38 95 Z"
            fill={FOX_CREAM}
          />

          {/* Body */}
          <ellipse cx="100" cy="135" rx="42" ry="35" fill={FOX_ORANGE} stroke={FOX_ORANGE_DARK} strokeWidth="1.5" />
          {/* Belly */}
          <ellipse cx="100" cy="145" rx="24" ry="22" fill={FOX_CREAM} />

          {/* Waving paw (left from fox POV = right on screen) */}
          <motion.g
            style={{ originX: '142px', originY: '138px' }}
            animate={{ rotate: [0, 18, -8, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
          >
            <ellipse cx="142" cy="148" rx="10" ry="14" fill={FOX_ORANGE} stroke={FOX_ORANGE_DARK} strokeWidth="1.5" />
            <ellipse cx="142" cy="158" rx="7" ry="5" fill={FOX_CREAM} />
          </motion.g>

          {/* Other paw (static) */}
          <ellipse cx="75" cy="165" rx="9" ry="7" fill={FOX_ORANGE} stroke={FOX_ORANGE_DARK} strokeWidth="1.5" />
          <ellipse cx="75" cy="167" rx="6" ry="4" fill={FOX_CREAM} />

          {/* Head */}
          <path
            d="M60 85 Q60 50 100 50 Q140 50 140 85 Q140 115 100 115 Q60 115 60 85 Z"
            fill={FOX_ORANGE}
            stroke={FOX_ORANGE_DARK}
            strokeWidth="1.5"
          />

          {/* Ears */}
          <path d="M62 70 L52 35 L78 58 Z" fill={FOX_ORANGE} stroke={FOX_ORANGE_DARK} strokeWidth="1.5" />
          <path d="M138 70 L148 35 L122 58 Z" fill={FOX_ORANGE} stroke={FOX_ORANGE_DARK} strokeWidth="1.5" />
          <path d="M60 64 L57 45 L70 58 Z" fill={FOX_CREAM} />
          <path d="M140 64 L143 45 L130 58 Z" fill={FOX_CREAM} />

          {/* Face cream patch */}
          <path
            d="M75 90 Q75 70 100 70 Q125 70 125 90 Q125 108 100 110 Q75 108 75 90 Z"
            fill={FOX_CREAM}
          />

          {/* Eyes — blink via scaleY */}
          <motion.g
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' } as any}
            transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
          >
            <ellipse cx="86" cy="88" rx="3.5" ry="4.5" fill={FOX_DARK} />
            <ellipse cx="114" cy="88" rx="3.5" ry="4.5" fill={FOX_DARK} />
            {/* Eye shine */}
            <circle cx="87" cy="86.5" r="1.1" fill="white" />
            <circle cx="115" cy="86.5" r="1.1" fill="white" />
          </motion.g>

          {/* Nose */}
          <path d="M96 99 Q100 102 104 99 Q104 104 100 105 Q96 104 96 99 Z" fill={FOX_DARK} />
          {/* Smile */}
          <path
            d="M94 107 Q100 112 106 107"
            fill="none"
            stroke={FOX_DARK}
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Cheek blush */}
          <circle cx="78" cy="100" r="4" fill={FOX_ORANGE} opacity="0.45" />
          <circle cx="122" cy="100" r="4" fill={FOX_ORANGE} opacity="0.45" />
        </svg>
      </motion.div>
    </div>
  );
};

const resolveFirstName = (
  profileFirstName: string | undefined,
  fullName: string | undefined,
  email: string | undefined
): string => {
  const fromProfile = profileFirstName?.trim();
  if (fromProfile) return fromProfile;
  const fromFull = fullName?.trim().split(/\s+/)[0];
  if (fromFull) return fromFull;
  const fromEmail = email?.split('@')[0];
  if (fromEmail) {
    return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
  }
  return 'Student';
};

const WelcomeFox = () => {
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const { language } = useLanguage();

  const firstName = resolveFirstName(
    profile?.firstName,
    user?.user_metadata?.full_name as string | undefined,
    user?.email ?? undefined
  );

  const greeting = language === 'fr' ? `Salut ${firstName} 👋` : `Hi ${firstName} 👋`;
  const subtitle =
    language === 'fr'
      ? 'Soumets ta question pour obtenir de l’aide'
      : 'Submit your question for help';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full px-4 py-6 md:py-10 flex justify-center"
    >
      <div className="w-full max-w-3xl bg-card border border-border shadow-sm rounded-3xl p-6 md:p-12 flex flex-col md:flex-row items-center gap-6 md:gap-10">
        <FoxMascot />
        <div className="flex-1 text-center md:text-left">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            className="text-2xl md:text-4xl font-bold text-foreground tracking-tight"
          >
            {greeting}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
            className="mt-3 text-base md:text-lg text-muted-foreground"
          >
            {subtitle}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default WelcomeFox;
