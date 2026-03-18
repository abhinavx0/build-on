export type PlacementStatus = 'unplaced' | 'placed' | 'offer_pending' | 'offer_revoked' | 'eligible_for_upgrade' | 'not_interested' | 'blacklisted';

export interface Student {
  reg_number: string;
  name: string;
  branch: string;
  batch_year: number;
  email: string;
  phone: string | null;
  cgpa: number;
  section?: string | null;
  user_id?: string | null;
}

export interface PlacementRecord {
  id?: string;
  reg_number: string;
  status: PlacementStatus;
  company_name: string | null;
  package_lpa: number | null;
  placed_date: string | null;
  updated_at: string;
  updated_by?: string | null;
  change_reason?: string | null;
}

export interface Drive {
  drive_id: string;
  company_name: string;
  description: string | null;
  eligibility_criteria: {
    min_cgpa: number;
    allowed_branches: string[];
    batch_year: number;
    allowed_statuses: PlacementStatus[];
  };
  drive_date: string;
  registration_deadline: string;
  is_active: boolean;
  shortlist_stale?: boolean;
  created_by?: string | null;
  created_at?: string;
}

export interface Application {
  application_id: string;
  reg_number: string;
  drive_id: string;
  applied_at: string;
  is_eligible: boolean;
}

export const STATUS_LABELS: Record<PlacementStatus, string> = {
  unplaced: 'Unplaced',
  placed: 'Placed',
  offer_pending: 'Offer Pending',
  offer_revoked: 'Offer Revoked',
  eligible_for_upgrade: 'Eligible for Upgrade',
  not_interested: 'Not Interested',
  blacklisted: 'Blacklisted',
};

export function checkEligibility(student: Student, placement: PlacementRecord, drive: Drive): { eligible: boolean; reason?: string } {
  const criteria = drive.eligibility_criteria;
  if (!criteria.allowed_statuses.includes(placement.status)) {
    return { eligible: false, reason: `Status "${STATUS_LABELS[placement.status]}" is not allowed for this drive` };
  }
  if (!criteria.allowed_branches.includes(student.branch)) {
    return { eligible: false, reason: `Branch "${student.branch}" is not eligible` };
  }
  if (student.batch_year !== criteria.batch_year) {
    return { eligible: false, reason: `Batch year ${student.batch_year} does not match required ${criteria.batch_year}` };
  }
  if (student.cgpa < criteria.min_cgpa) {
    return { eligible: false, reason: `CGPA ${student.cgpa} is below minimum ${criteria.min_cgpa}` };
  }
  return { eligible: true };
}
