import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/** Source-text keys keep migrated interface copy readable at the call site. */
export function useInterfaceTranslation() {
  const { t } = useTranslation('interface');
  return useCallback((text: string, values?: Record<string, string | number>) =>
    String(t(text, { ...values, nsSeparator: false, defaultValue: text })), [t]);
}
