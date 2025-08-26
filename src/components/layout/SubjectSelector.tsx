
import { useAdmin } from "@/context/AdminContext";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { usePromptManagement } from "@/hooks/usePromptManagement";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SubjectSelector = () => {
  const { subjects, selectedSubject, setSelectedSubject } = useAdmin();
  const { t } = useLanguage();
  const { autoActivateForSubject } = usePromptManagement();
  const activeSubjects = subjects.filter(subject => subject.active);

  const getTranslatedSubjectName = (subjectName: string) => {
    const subjectKey = subjectName.toLowerCase().replace(/\s+/g, '');
    const translationKey = `subjects.${subjectKey}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : subjectName;
  };

  return (
    <Select 
      value={selectedSubject?.id} 
      onValueChange={async (value) => {
        const subject = subjects.find(s => s.id === value);
        setSelectedSubject(subject || null);
        
        // Auto-activate prompts for the selected subject
        if (subject) {
          await autoActivateForSubject(subject.name);
        }
      }}
    >
      <SelectTrigger className="w-[180px] bg-studywhiz-100 text-studywhiz-700 dark:bg-studywhiz-900/20 dark:text-studywhiz-400 border-none">
        <SelectValue placeholder={t('common.selectSubject')} />
      </SelectTrigger>
      <SelectContent>
        {activeSubjects.map((subject) => (
          <SelectItem key={subject.id} value={subject.id}>
            {getTranslatedSubjectName(subject.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SubjectSelector;
