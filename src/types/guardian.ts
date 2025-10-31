// Guardian-specific types

export interface Guardian {
  id: string;
  user_id: string;
  billing_customer_id?: string | null;
  phone?: string | null;
  address_json?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  user_id: string;
  contact_email?: string | null;
  grade?: string | null;
  curriculum?: string | null;
  settings_json?: ChildSettings;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChildSettings {
  show_correct_answer?: boolean;
  allow_content_upload?: boolean;
  messaging_limit?: number;
}

export interface GuardianChildLink {
  id: string;
  guardian_id: string;
  child_id: string;
  relation: string;
  permissions_json?: Record<string, any>;
  created_at: string;
}

export interface DelegationToken {
  id: string;
  guardian_id: string;
  child_id: string;
  jti_hash: string;
  scope: string;
  expires_at: string;
  used_at?: string | null;
  created_at: string;
}

export interface ExplanationCache {
  id: string;
  attempt_id: string;
  steps_json: {
    step: number;
    description: string;
  }[];
  correct_answer: string;
  tips_for_parent?: string | null;
  generated_at: string;
}

export interface ChildWithUser extends Child {
  user: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username: string;
    email?: string | null;
  };
  last_activity?: string;
}
