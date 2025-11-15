export interface Domain {
  domain: string;
}

export interface Subdomain {
  id: number;
  domain: string;
  subdomain: string;
}

export interface Objective {
  id: string;
  level: string;
  domain: string | null;
  subdomain: string;
  text: string;
  notes_from_prog: string | null;
  subject_id: string | null;
  domain_id: string | null;
  subdomain_id: string | null;
  skill_id: string | null;
}

export interface SuccessCriterion {
  id: string;
  objective_id: string | null;
  text: string;
  subject_id: string | null;
  domain_id: string | null;
  subdomain_id: string | null;
  skill_id: string | null;
}

export interface Task {
  id: string;
  success_criterion_id: string | null;
  type: string;
  stem: string;
  solution: string | null;
  rubric: string | null;
  subject_id: string | null;
  domain_id: string | null;
  subdomain_id: string | null;
  skill_id: string | null;
}

export interface Unit {
  id: string;
  level: string;
  domain: string;
  subdomain: string;
  title: string;
  duration_weeks: number | null;
}

export interface Lesson {
  id: string;
  unit_id: string | null;
  title: string;
  objective_ids: any;
  success_criterion_ids: any;
  materials: string | null;
  misconceptions: string | null;
  teacher_talk: string | null;
  student_worksheet: string | null;
}

export interface ImportBundle {
  domains?: Domain[];
  subdomains?: Subdomain[];
  objectives?: Objective[];
  success_criteria?: SuccessCriterion[];
  tasks?: Task[];
  units?: Unit[];
  lessons?: Lesson[];
}

export interface ImportCounts {
  domains: number;
  subdomains: number;
  objectives: number;
  success_criteria: number;
  tasks: number;
  units: number;
  lessons: number;
}

export interface ObjectiveWithSuccessCriteria extends Objective {
  success_criteria: SuccessCriterion[];
}

// Curriculum bundle structure types
export interface CurriculumBundle {
  version: string;
  schema: string;
  countries: CurriculumCountry[];
}

export interface CurriculumCountry {
  id: string;
  name: string;
  levels: CurriculumLevel[];
}

export interface CurriculumLevel {
  id: string;
  label: string;
  grade: number;
  cycle?: string;
  subjects: CurriculumSubject[];
}

export interface CurriculumSubject {
  id: string;
  label: string;
  labels: Record<string, string>;
  color?: string;
  icon?: string;
  domains: CurriculumDomain[];
}

export interface CurriculumDomain {
  id: string;
  code: string;
  labels: Record<string, string>;
  subdomains: CurriculumSubdomain[];
}

export interface CurriculumSubdomain {
  id: string;
  code: string;
  labels: Record<string, string>;
  skills?: CurriculumSkill[];
}

export interface CurriculumSkill {
  id: string;
  code: string;
  labels: Record<string, string>;
  description?: Record<string, string>;
}
