
import { useAdmin } from "@/context/AdminContext";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation(); // <-- Add i18n here
  const { autoActivateForSubject } = usePromptManagement();
  const activeSubjects = subjects.filter(subject => subject.active);

  const getTranslatedSubjectName = (subjectName: string) => {
    // Create a mapping for common subject names to translation keys
    const subjectMapping: Record<string, string> = {
      'Mathematics': 'subjects.math',
      'Physics': 'subjects.physics',
      'Chemistry': 'subjects.chemistry',
      'Biology': 'subjects.biology',
      'English': 'subjects.english',
      'History': 'subjects.history',
      'Geography': 'subjects.geography',
      'French': 'subjects.french',
      'Spanish': 'subjects.spanish',
      'Computer Science': 'subjects.computerScience',
      'Literature': 'subjects.literature',
      'Grammar': 'subjects.grammar',
      'Writing': 'subjects.writing',
      'Reading': 'subjects.reading',
      'Algebra': 'subjects.algebra',
      'Geometry': 'subjects.geometry',
      'Calculus': 'subjects.calculus',
      'Statistics': 'subjects.statistics',
      'Programming': 'subjects.programming',
      'Art': 'subjects.art',
      'Music': 'subjects.music',
      'Physical Education': 'subjects.physicalEducation',
      'Social Studies': 'subjects.socialStudies',
      'Economics': 'subjects.economics',
      'Philosophy': 'subjects.philosophy',
      'Psychology': 'subjects.psychology',
      'Sociology': 'subjects.sociology',
      'Political Science': 'subjects.politicalScience',
      'Environmental Science': 'subjects.environmentalScience',
      'Astronomy': 'subjects.astronomy',
      'Geology': 'subjects.geology',
      'Meteorology': 'subjects.meteorology',
      'Oceanography': 'subjects.oceanography',
      'Botany': 'subjects.botany',
      'Zoology': 'subjects.zoology',
      'Microbiology': 'subjects.microbiology',
      'Genetics': 'subjects.genetics',
      'Anatomy': 'subjects.anatomy',
      'Physiology': 'subjects.physiology',
      'Neuroscience': 'subjects.neuroscience',
      'Immunology': 'subjects.immunology',
      'Epidemiology': 'subjects.epidemiology',
      'Pharmacology': 'subjects.pharmacology',
      'Toxicology': 'subjects.toxicology',
      'Biochemistry': 'subjects.biochemistry',
      'Molecular Biology': 'subjects.molecularBiology',
      'Cell Biology': 'subjects.cellBiology',
      'Ecology': 'subjects.ecology',
      'Evolution': 'subjects.evolution',
      'Taxonomy': 'subjects.taxonomy',
      'Paleontology': 'subjects.paleontology',
      'Anthropology': 'subjects.anthropology',
      'Archaeology': 'subjects.archaeology',
      'Linguistics': 'subjects.linguistics',
      'Foreign Language': 'subjects.foreignLanguage',
      'Dutch': 'subjects.dutch',
      'Swedish': 'subjects.swedish',
      'Norwegian': 'subjects.norwegian',
      'Danish': 'subjects.danish',
      'Finnish': 'subjects.finnish',
      'Polish': 'subjects.polish',
      'Czech': 'subjects.czech',
      'Hungarian': 'subjects.hungarian',
      'Romanian': 'subjects.romanian',
      'Bulgarian': 'subjects.bulgarian',
      'Greek': 'subjects.greek',
      'Latin': 'subjects.latin',
      'Ancient Greek': 'subjects.ancientGreek',
      'Sanskrit': 'subjects.sanskrit',
      'Hebrew': 'subjects.hebrew',
      'Persian': 'subjects.persian',
      'Thai': 'subjects.thai',
      'Vietnamese': 'subjects.vietnamese',
      'Indonesian': 'subjects.indonesian',
      'Malay': 'subjects.malay',
      'Filipino': 'subjects.filipino',
      'Swahili': 'subjects.swahili',
      'Yoruba': 'subjects.yoruba',
      'Zulu': 'subjects.zulu',
      'Afrikaans': 'subjects.afrikaans',
      'Amharic': 'subjects.amharic',
      'Somali': 'subjects.somali',
      'Igbo': 'subjects.igbo',
      'Hausa': 'subjects.hausa',
      'Fulani': 'subjects.fulani',
      'Wolof': 'subjects.wolof',
      'Mandinka': 'subjects.mandinka',
      'Songhai': 'subjects.songhai',
      'Berber': 'subjects.berber',
      'Tuareg': 'subjects.tuareg',
      'Coptic': 'subjects.coptic',
      'Ethiopic': 'subjects.ethiopic',
      'Syriac': 'subjects.syriac',
      'Armenian': 'subjects.armenian',
      'Georgian': 'subjects.georgian',
      'Albanian': 'subjects.albanian',
      'Macedonian': 'subjects.macedonian',
      'Serbian': 'subjects.serbian',
      'Croatian': 'subjects.croatian',
      'Slovenian': 'subjects.slovenian',
      'Slovak': 'subjects.slovak',
      'Estonian': 'subjects.estonian',
      'Latvian': 'subjects.latvian',
      'Lithuanian': 'subjects.lithuanian',
      'Icelandic': 'subjects.icelandic',
      'Faroese': 'subjects.faroese',
      'Greenlandic': 'subjects.greenlandic',
      'Sami': 'subjects.sami',
      'Basque': 'subjects.basque',
      'Catalan': 'subjects.catalan',
      'Galician': 'subjects.galician',
      'Occitan': 'subjects.occitan',
      'Breton': 'subjects.breton',
      'Cornish': 'subjects.cornish',
      'Welsh': 'subjects.welsh',
      'Irish': 'subjects.irish',
      'Scottish Gaelic': 'subjects.scottishGaelic',
      'Manx': 'subjects.manx',
      'Frisian': 'subjects.frisian',
      'Luxembourgish': 'subjects.luxembourgish',
      'Romansh': 'subjects.romansh',
      'Friulian': 'subjects.friulian',
      'Ladin': 'subjects.ladin',
      'Sardinian': 'subjects.sardinian',
      'Corsican': 'subjects.corsican',
      'Sicilian': 'subjects.sicilian',
      'Neapolitan': 'subjects.neapolitan',
      'Venetian': 'subjects.venetian',
      'Lombard': 'subjects.lombard',
      'Piedmontese': 'subjects.piedmontese',
      'Emilian': 'subjects.emilian',
      'Romagnol': 'subjects.romagnol',
      'Ligurian': 'subjects.ligurian',
      'Tuscan': 'subjects.tuscan',
      'Umbrian': 'subjects.umbrian',
      'Marches': 'subjects.marches',
      'Abruzzese': 'subjects.abruzzese',
      'Molisan': 'subjects.molisan',
      'Apulian': 'subjects.apulian',
      'Calabrian': 'subjects.calabrian',
      'Lucanian': 'subjects.lucanian',
      'Campanian': 'subjects.campanian',
      'Lazio': 'subjects.lazio',
      'Trentino': 'subjects.trentino',
      'South Tyrol': 'subjects.southTyrol',
      'Friuli': 'subjects.friuli',
      'Veneto': 'subjects.veneto',
      'Lombardy': 'subjects.lombardy',
      'Piedmont': 'subjects.piedmont',
      'Valle d\'Aosta': 'subjects.valleDAosta',
      'Liguria': 'subjects.liguria',
      'Tuscany': 'subjects.tuscany',
      'Umbria': 'subjects.umbria',
      'Marche': 'subjects.marche',
      'Abruzzo': 'subjects.abruzzo',
      'Molise': 'subjects.molise',
      'Puglia': 'subjects.puglia',
      'Calabria': 'subjects.calabria',
      'Basilicata': 'subjects.basilicata',
      'Campania': 'subjects.campania',
      'Sicily': 'subjects.sicily',
      'Sardinia': 'subjects.sardinia'
    };

    const translationKey = subjectMapping[subjectName];
    
    // Debug logging
    console.log('Subject:', subjectName);
    console.log('Translation key:', translationKey);
    console.log('Current language:', i18n.resolvedLanguage);
    console.log('Available languages:', i18n.languages);
    
    if (translationKey) {
      const translated = t(translationKey);
      console.log('Translated result:', translated);
      console.log('Translation key vs result:', translationKey, '->', translated);
      
      // If translation key equals result, it means the translation wasn't found
      if (translated === translationKey) {
        console.warn('Translation not found for key:', translationKey);
        return subjectName; // Fallback to original name
      }
      
      return translated;
    }
    
    // Fallback: try to create a key from the subject name
    const subjectKey = subjectName.toLowerCase().replace(/\s+/g, '');
    const fallbackKey = `subjects.${subjectKey}`;
    const fallbackTranslated = t(fallbackKey);
    
    console.log('Fallback key:', fallbackKey);
    console.log('Fallback result:', fallbackTranslated);
    
    return fallbackTranslated !== fallbackKey ? fallbackTranslated : subjectName;
  };

  // Debug: Log current language and available subjects
  console.log('Current language:', i18n.resolvedLanguage);
  console.log('Available subjects:', activeSubjects.map(s => s.name));

  console.log('Testing translation system:');
  console.log('t("subjects.math"):', t('subjects.math'));
  console.log('t("subjects.physics"):', t('subjects.physics'));
  console.log('t("common.selectSubject"):', t('common.selectSubject'));

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
