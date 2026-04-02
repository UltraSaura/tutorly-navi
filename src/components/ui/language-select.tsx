import React from 'react';
import { useLanguage } from '@/context/SimpleLanguageContext';

export function LanguageSelect() {
  const { language, changeLanguage } = useLanguage();

  return (
    <select 
      value={language} 
      onChange={(e) => {
        changeLanguage(e.target.value);
        // Reload page to ensure all components pick up the language change
        setTimeout(() => window.location.reload(), 100);
      }}
      className="px-3 py-2 border border-neutral-border rounded-button bg-neutral-surface text-neutral-text hover:bg-neutral-bg focus:outline-none focus:ring-2 focus:ring-brand-primary"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
    </select>
  );
}