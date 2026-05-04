import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

export function useI18nSync() {
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  // Read ?hl= param on mount to support deep-linked language selection.
  // We do NOT write ?hl= back to the URL — doing so created a feedback loop
  // where the URL overrode the user's in-app language picker on every render.
  useEffect(() => {
    const hlParam = searchParams.get('hl');
    if (hlParam && i18n.resolvedLanguage?.split('-')[0] !== hlParam) {
      i18n.changeLanguage(hlParam);
    }
    // Only run on mount — intentionally omit searchParams from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
