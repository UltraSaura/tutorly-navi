import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ADMIN_PREVIEW_LEVELS,
  labelForAdminPreviewLevel,
  useAdminPreview,
  type AdminPreviewLevel,
} from '@/contexts/AdminPreviewContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const REAL_PROFILE_VALUE = 'real_profile';

export function AdminPreviewSelector({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const { isAdmin } = useAdminAuth();
  const { previewLevel, setPreviewLevel, clearPreviewMode } = useAdminPreview();
  if (!isAdmin) return null;

  const language = i18n.resolvedLanguage ?? i18n.language ?? 'fr';

  return (
    <div className="flex items-center gap-2">
      {!compact ? (
        <span className="text-xs font-medium text-muted-foreground">Voir comme</span>
      ) : null}
      <Select
        value={previewLevel ?? REAL_PROFILE_VALUE}
        onValueChange={(value) => {
          if (value === REAL_PROFILE_VALUE) clearPreviewMode();
          else setPreviewLevel(value as AdminPreviewLevel);
        }}
      >
        <SelectTrigger className="h-9 w-[9.5rem] bg-background">
          <SelectValue placeholder="Voir comme" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          <SelectItem value={REAL_PROFILE_VALUE}>Profil réel</SelectItem>
          {ADMIN_PREVIEW_LEVELS.map((level) => (
            <SelectItem key={level.code} value={level.code}>
              {language.startsWith('en') ? level.labelEn : level.labelFr}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AdminPreviewBanner() {
  const { i18n } = useTranslation();
  const { isAdmin } = useAdminAuth();
  const { isAdminPreviewEnabled, previewLevel, clearPreviewMode } = useAdminPreview();
  if (!isAdmin || !isAdminPreviewEnabled || !previewLevel) return null;

  const language = i18n.resolvedLanguage ?? i18n.language ?? 'fr';
  const label = labelForAdminPreviewLevel(previewLevel, language);
  const isEnglish = language.startsWith('en');

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">
            {isEnglish ? `Student preview mode: ${label}` : `Mode aperçu élève : ${label}`}
          </span>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 bg-background/80" onClick={clearPreviewMode}>
          {isEnglish ? 'Exit preview' : "Quitter l'aperçu"}
        </Button>
      </div>
    </div>
  );
}
