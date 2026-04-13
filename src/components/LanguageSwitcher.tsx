import { useLanguage } from "@/context/SimpleLanguageContext";

function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();
  return (
    <select
      value={language}
      onChange={(e) => changeLanguage(e.target.value)}
      className="border rounded-md px-2 py-1"
      aria-label="Select language"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
    </select>
  );
}

export default LanguageSwitcher;
