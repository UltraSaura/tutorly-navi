
import { useAdmin } from "@/context/AdminContext";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SubjectSelector = () => {
  const { subjects, selectedSubject, setSelectedSubject } = useAdmin();
  const activeSubjects = subjects.filter(subject => subject.active);

  return (
    <Select 
      value={selectedSubject?.id} 
      onValueChange={(value) => {
        const subject = subjects.find(s => s.id === value);
        setSelectedSubject(subject || null);
      }}
    >
      <SelectTrigger className="w-[180px] bg-studywhiz-100 text-studywhiz-700 dark:bg-studywhiz-900/20 dark:text-studywhiz-400 border-none">
        <SelectValue placeholder="Select a subject" />
      </SelectTrigger>
      <SelectContent>
        {activeSubjects.map((subject) => (
          <SelectItem key={subject.id} value={subject.id}>
            {subject.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SubjectSelector;
