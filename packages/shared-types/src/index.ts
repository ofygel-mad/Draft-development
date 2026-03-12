export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Customer {
  id: string;
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
  bin_iin: string;
  source: string;
  status: 'new' | 'active' | 'inactive' | 'archived';
  owner: UserShort | null;
  created_at: string;
  follow_up_due_at: string | null;
  response_state: string;
  last_contact_at: string | null;
  health: { score: number; band: 'green' | 'yellow' | 'red'; factors: Record<string, unknown> };
}

export interface Deal {
  id: string;
  title: string;
  amount: number | null;
  currency: string;
  status: 'open' | 'won' | 'lost' | 'paused';
  owner: UserShort | null;
  customer: Customer;
  stage: PipelineStage;
  expected_close_date: string | null;
  created_at: string;
}

export interface UserShort {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  stage_type: 'open' | 'won' | 'lost';
  color: string;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'done' | 'cancelled';
  due_at: string | null;
  completed_at: string | null;
  assigned_to: UserShort | null;
  customer: string | null;
  deal: string | null;
  created_at: string;
}
