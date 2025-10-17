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
  schoolLevel: string;
  username: string;        // NEW: Unique username for login
  password?: string;       // NEW: Individual password (optional)
  email?: string;          // NEW: Optional email for notifications
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
}

export interface ChildRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  phoneNumber?: string;
  schoolLevel: string;
  username: string;
}

export type UserType = 'student' | 'parent';