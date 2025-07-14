export interface Country {
  id: string;
  code: string;
  name: string;
}

export interface SchoolLevel {
  id: string;
  country_code: string;
  level_code: string;
  level_name: string;
  sort_order: number;
}

export interface ChildInfo {
  firstName: string;
  country: string;
  schoolLevel: string;
}

export interface StudentRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  phoneNumber: string;
  schoolLevel: string;
}

export interface ParentRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  phoneNumber: string;
  children: ChildInfo[];
}

export type UserType = 'student' | 'parent';