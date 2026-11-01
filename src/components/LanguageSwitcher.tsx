import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useLanguage } from "@/context/SimpleLanguageContext";

function LanguageSwitcher() {
  const ui = useInterfaceTranslation();
  const { language, changeLanguage } = useLanguage();
  return (
    <select
      value={language}
      onChange={(e) => changeLanguage(e.target.value)}
      className="border rounded-md px-2 py-1"
      aria-label={ui("Select language")}
    >
      <option value="en">{ui("English")}</option>
      <option value="fr">Français</option>
    </select>
  );
}

export default LanguageSwitcher;
