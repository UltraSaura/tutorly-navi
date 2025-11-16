export interface Teacher {
  id: string;
  user_id: string;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  teacher_id: string;
  level_code: string | null;
  country_code: string | null;
  subject_id: string | null;
  school_year: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassStudentLink {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface ClassWithStats extends Class {
  student_count: number;
  teacher?: {
    user_id: string;
    first_name: string;
    last_name: string;
  };
}

export interface StudentInClass {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  level_code: string | null;
  country_code: string | null;
  enrolled_at: string;
}
