// Unified progress types used by students, parents, and teachers

export interface SubjectProgress {
  subject_id: string;
  subject_name: string;
  subject_color: string;
  total_objectives: number;
  mastered_objectives: number;
  in_progress_objectives: number;
  mastery_ratio: number; // 0 to 1
}

export interface StudentCurriculumProgress {
  student_id: string;
  student_name: string;
  country_code: string;
  level_code: string;
  subjects: SubjectProgress[];
  overall_mastery_ratio: number;
}

export interface SubdomainWeakness {
  subdomain_id: string;
  subdomain_name: string;
  subject_id: string;
  subject_name: string;
  total_objectives: number;
  mastered_objectives: number;
  mastery_ratio: number;
}
