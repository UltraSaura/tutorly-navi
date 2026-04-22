import { motion } from 'framer-motion';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/SimpleLanguageContext';

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
  const name = resolveFirstName(
    profile?.firstName,
    user?.user_metadata?.full_name as string | undefined,
    user?.email ?? undefined,
    isFr ? 'Élève' : 'Student'
  );

  const greeting = isFr ? 'Salut' : 'Hi';
  const subtitle = isFr
    ? 'Soumets ta question pour obtenir de l’aide'
    : 'Submit your question for help';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto px-4 py-6"
    >
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* FOX */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-32 h-32 relative flex-shrink-0"
          >
            {/* Head */}
            <motion.div
              className="w-28 h-28 bg-orange-400 rounded-full relative"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              {/* Ears */}
              <div className="absolute -top-3 left-3 w-4 h-6 bg-orange-400 rotate-[-20deg] rounded-sm" />
              <div className="absolute -top-3 right-3 w-4 h-6 bg-orange-400 rotate-[20deg] rounded-sm" />
              {/* Face */}
              <div className="absolute inset-4 bg-orange-100 rounded-full" />
              {/* Eyes */}
              <motion.div
                className="absolute top-10 left-6 w-2 h-3 bg-black rounded-full"
                animate={{ scaleY: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
              />
              <motion.div
                className="absolute top-10 right-6 w-2 h-3 bg-black rounded-full"
                animate={{ scaleY: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
              />
              {/* Nose */}
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rounded-full" />
            </motion.div>
            {/* Paw */}
            <motion.div
              className="absolute top-2 -right-2 w-6 h-10 bg-orange-400 rounded-full"
              animate={{ rotate: [0, 20, -10, 20, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{ transformOrigin: 'bottom left' }}
            />
          </motion.div>

          {/* TEXT */}
          <div className="text-center sm:text-left">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-semibold text-foreground"
            >
              {greeting} <span className="text-primary">{name}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-muted-foreground mt-1"
            >
              {subtitle}
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WelcomeFox;
