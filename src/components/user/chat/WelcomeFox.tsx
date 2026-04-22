import { motion } from 'framer-motion';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/SimpleLanguageContext';

// Palette (kept as inline constants — these are illustration colors, not theme tokens)
const FOX_ORANGE = '#F47A20';
const FOX_ORANGE_DARK = '#D9621A';
const CREAM = '#FFF3E0';
const HOODIE = '#3FB8A0';
const HOODIE_DARK = '#2E9684';
const OUTLINE = '#3A2418';
const PAW_PINK = '#F4A29A';
const PURPLE = '#8B7BD8';
const YELLOW = '#F5C842';
const NAVY = '#1E293B';

const FoxMascot = () => {
  return (
    <div className="relative w-44 md:w-56 flex-shrink-0">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 240 280" className="w-full h-auto" aria-label="Friendly fox mascot waving">
          {/* Soft ground shadow */}
          <ellipse cx="120" cy="270" rx="55" ry="5" fill={OUTLINE} opacity="0.12" />

          {/* Tail (behind body) */}
          <path
            d="M70 200 Q40 195 38 165 Q42 175 60 178 Q65 188 70 200 Z"
            fill={FOX_ORANGE}
            stroke={OUTLINE}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M44 168 Q42 175 50 178 Q53 172 50 167 Z" fill={CREAM} />

          {/* Feet */}
          <ellipse cx="100" cy="262" rx="12" ry="7" fill={OUTLINE} />
          <ellipse cx="138" cy="262" rx="12" ry="7" fill={OUTLINE} />

          {/* Backpack strap (over right shoulder) */}
          <path d="M148 152 Q156 160 158 200" stroke="#C46A2A" strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="151" y="178" width="10" height="6" rx="1.5" fill="#8A4A1E" />

          {/* Hoodie body */}
          <path
            d="M78 160 Q78 150 90 148 L150 148 Q162 150 162 160 L166 248 Q166 258 156 258 L84 258 Q74 258 74 248 Z"
            fill={HOODIE}
            stroke={OUTLINE}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Kangaroo pocket */}
          <path
            d="M95 210 Q120 220 145 210 L142 238 L98 238 Z"
            fill={HOODIE_DARK}
            stroke={OUTLINE}
            strokeWidth="2"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* Right arm (down at side) */}
          <path
            d="M78 168 Q70 200 76 232 Q88 234 92 230 Q90 200 92 170 Z"
            fill={HOODIE}
            stroke={OUTLINE}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Right paw */}
          <ellipse cx="84" cy="234" rx="10" ry="9" fill={FOX_ORANGE} stroke={OUTLINE} strokeWidth="2" />
          <ellipse cx="84" cy="237" rx="6" ry="4" fill={CREAM} />

          {/* Raised waving arm — pivot at left shoulder (~150,160) */}
          <motion.g
            style={{ transformOrigin: '150px 160px', transformBox: 'view-box' as any }}
            animate={{ rotate: [-8, 14, -8] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Sleeve */}
            <path
              d="M148 162 Q172 130 188 92 Q200 88 206 96 Q198 134 168 174 Z"
              fill={HOODIE}
              stroke={OUTLINE}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Open paw / hand */}
            <ellipse cx="200" cy="86" rx="16" ry="18" fill={FOX_ORANGE} stroke={OUTLINE} strokeWidth="2.5" />
            {/* Cream palm */}
            <ellipse cx="200" cy="90" rx="10" ry="12" fill={CREAM} />
            {/* Pink paw pads */}
            <ellipse cx="200" cy="94" rx="4" ry="3" fill={PAW_PINK} />
            <ellipse cx="194" cy="86" rx="2" ry="2.2" fill={PAW_PINK} />
            <ellipse cx="200" cy="83" rx="2" ry="2.2" fill={PAW_PINK} />
            <ellipse cx="206" cy="86" rx="2" ry="2.2" fill={PAW_PINK} />

            {/* Motion lines */}
            <motion.g
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              stroke={PURPLE}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M222 70 Q228 74 224 82" />
              <path d="M226 90 Q234 92 230 102" />
              <path d="M218 56 Q226 56 224 66" />
            </motion.g>
          </motion.g>

          {/* Head */}
          <path
            d="M70 100 Q70 58 120 58 Q170 58 170 100 Q170 152 120 156 Q70 152 70 100 Z"
            fill={FOX_ORANGE}
            stroke={OUTLINE}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Ears */}
          <path d="M72 82 L60 38 L96 68 Z" fill={FOX_ORANGE} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M168 82 L180 38 L144 68 Z" fill={FOX_ORANGE} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M74 76 L68 50 L86 66 Z" fill={CREAM} />
          <path d="M166 76 L172 50 L154 66 Z" fill={CREAM} />

          {/* Face cream patch */}
          <path
            d="M86 108 Q86 82 120 82 Q154 82 154 108 Q154 138 120 142 Q86 138 86 108 Z"
            fill={CREAM}
          />

          {/* Eyes (blink) */}
          <motion.g
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' } as any}
            transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
          >
            <ellipse cx="102" cy="108" rx="5" ry="6.5" fill={OUTLINE} />
            <ellipse cx="138" cy="108" rx="5" ry="6.5" fill={OUTLINE} />
            <circle cx="103.5" cy="105.5" r="1.6" fill="white" />
            <circle cx="139.5" cy="105.5" r="1.6" fill="white" />
          </motion.g>

          {/* Nose */}
          <path d="M115 124 Q120 128 125 124 Q125 130 120 131 Q115 130 115 124 Z" fill={OUTLINE} />

          {/* Smiling open mouth with tongue */}
          <path
            d="M108 134 Q120 146 132 134 Q132 142 120 144 Q108 142 108 134 Z"
            fill={OUTLINE}
          />
          <path d="M115 140 Q120 144 125 140 Q125 143 120 144 Q115 143 115 140 Z" fill={PAW_PINK} />

          {/* Cheeks */}
          <circle cx="92" cy="122" r="4" fill={FOX_ORANGE} opacity="0.5" />
          <circle cx="148" cy="122" r="4" fill={FOX_ORANGE} opacity="0.5" />

          {/* Hood drawstrings */}
          <path d="M104 152 Q102 168 100 178" stroke={OUTLINE} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M136 152 Q138 168 140 178" stroke={OUTLINE} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="180" r="2.5" fill={CREAM} stroke={OUTLINE} strokeWidth="1.2" />
          <circle cx="140" cy="180" r="2.5" fill={CREAM} stroke={OUTLINE} strokeWidth="1.2" />
        </svg>
      </motion.div>
    </div>
  );
};

const SpeechBubble = ({
  greetingPrefix,
  firstName,
  subtitle,
}: {
  greetingPrefix: string;
  firstName: string;
  subtitle: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
      className="relative flex-1 w-full max-w-md"
    >
      {/* Pointer — left on desktop, top on mobile */}
      <div
        className="hidden md:block absolute left-[-14px] top-12 w-0 h-0"
        style={{
          borderTop: '12px solid transparent',
          borderBottom: '12px solid transparent',
          borderRight: '16px solid hsl(var(--border))',
        }}
        aria-hidden="true"
      />
      <div
        className="hidden md:block absolute left-[-11px] top-[51px] w-0 h-0"
        style={{
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          borderRight: '14px solid hsl(var(--card))',
        }}
        aria-hidden="true"
      />
      {/* Mobile pointer (top) */}
      <div
        className="md:hidden absolute left-1/2 -translate-x-1/2 top-[-14px] w-0 h-0"
        style={{
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderBottom: '16px solid hsl(var(--border))',
        }}
        aria-hidden="true"
      />
      <div
        className="md:hidden absolute left-1/2 -translate-x-1/2 top-[-11px] w-0 h-0"
        style={{
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderBottom: '14px solid hsl(var(--card))',
        }}
        aria-hidden="true"
      />

      <div className="relative bg-card border border-border shadow-md rounded-[2rem] px-7 py-8 md:px-9 md:py-10 overflow-hidden">
        {/* Sparkle lines top-right */}
        <motion.svg
          className="absolute top-3 right-4 w-10 h-10"
          viewBox="0 0 40 40"
          aria-hidden="true"
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M8 14 L18 14" stroke={PURPLE} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M14 6 L20 14" stroke={PURPLE} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M22 4 L24 12" stroke={PURPLE} strokeWidth="2.4" strokeLinecap="round" />
        </motion.svg>

        {/* Yellow star bottom-right */}
        <motion.svg
          className="absolute bottom-3 right-5 w-6 h-6"
          viewBox="0 0 24 24"
          aria-hidden="true"
          animate={{ scale: [0.9, 1.1, 0.9], rotate: [0, 8, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M12 2 L14 9 L21 10 L15.5 14.5 L17 21 L12 17.5 L7 21 L8.5 14.5 L3 10 L10 9 Z"
            fill={YELLOW}
            stroke={OUTLINE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </motion.svg>

        <div className="text-center md:text-left">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ color: NAVY }}
          >
            {greetingPrefix}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55, ease: 'easeOut' }}
            className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1"
            style={{ color: PURPLE }}
          >
            {firstName} 👋
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7, ease: 'easeOut' }}
            className="mt-3 text-sm md:text-base text-muted-foreground max-w-[22rem] mx-auto md:mx-0"
          >
            {subtitle}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

const resolveFirstName = (
  profileFirstName: string | undefined,
  fullName: string | undefined,
  email: string | undefined,
  fallback: string
): string => {
  const fromProfile = profileFirstName?.trim();
  if (fromProfile) return fromProfile;
  const fromFull = fullName?.trim().split(/\s+/)[0];
  if (fromFull) return fromFull;
  const fromEmail = email?.split('@')[0];
  if (fromEmail) return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
  return fallback;
};

const WelcomeFox = () => {
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const { language } = useLanguage();

  const isFr = language === 'fr';
  const firstName = resolveFirstName(
    profile?.firstName,
    user?.user_metadata?.full_name as string | undefined,
    user?.email ?? undefined,
    isFr ? 'Élève' : 'Student'
  );

  const greetingPrefix = isFr ? 'Salut' : 'Hi';
  const subtitle = isFr
    ? 'Soumets ta question pour obtenir de l’aide'
    : 'Submit your question for help';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full px-4 py-6 md:py-10 flex justify-center"
    >
      <div className="w-full max-w-3xl flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
        <FoxMascot />
        <SpeechBubble
          greetingPrefix={greetingPrefix}
          firstName={firstName}
          subtitle={subtitle}
        />
      </div>
    </motion.div>
  );
};

export default WelcomeFox;
