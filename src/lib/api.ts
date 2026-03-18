import { supabase } from '@/integrations/supabase/client';
import type { Student, PlacementRecord, Drive, Application, PlacementStatus } from '@/data/mockData';

// ── Fetch helpers ──────────────────────────────────────────────────────────────

export async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await supabase.from('students').select('*').order('reg_number');
  if (error) throw error;
  return data as Student[];
}

export async function fetchPlacements(): Promise<PlacementRecord[]> {
  const { data, error } = await supabase.from('placement_records').select('*');
  if (error) throw error;
  return (data ?? []).map(d => ({
    ...d,
    status: d.status as PlacementRecord['status'],
  }));
}

export async function fetchDrives(): Promise<Drive[]> {
  const { data, error } = await supabase.from('drives').select('*').order('drive_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(d => ({
    ...d,
    eligibility_criteria: d.eligibility_criteria as Drive['eligibility_criteria'],
  }));
}

export async function fetchApplications(): Promise<Application[]> {
  const { data, error } = await supabase.from('applications').select('*');
  if (error) throw error;
  return data as Application[];
}

// ── Drive CRUD ─────────────────────────────────────────────────────────────────

export async function createDrive(drive: Omit<Drive, 'drive_id' | 'created_at'>): Promise<Drive> {
  const { data, error } = await supabase.from('drives').insert(drive).select().single();
  if (error) throw error;
  return { ...data, eligibility_criteria: data.eligibility_criteria as Drive['eligibility_criteria'] };
}

export async function updateDrive(driveId: string, updates: Partial<Omit<Drive, 'drive_id' | 'created_at'>>): Promise<void> {
  const { error } = await supabase.from('drives').update(updates).eq('drive_id', driveId);
  if (error) throw error;
}

export async function deleteDrive(driveId: string): Promise<void> {
  // First delete associated applications
  const { error: appError } = await supabase.from('applications').delete().eq('drive_id', driveId);
  if (appError) throw appError;
  
  // Then delete the drive
  const { error: driveError } = await supabase.from('drives').delete().eq('drive_id', driveId);
  if (driveError) throw driveError;
}

// ── Placement updates ──────────────────────────────────────────────────────────

/**
 * Ensures an application record exists linking a student to any matching active drive.
 * Called automatically when a student is marked as placed at a company.
 */
async function ensureApplicationForPlacement(regNumber: string, companyName: string): Promise<void> {
  // Find active drives matching this company name (case-insensitive)
  const { data: matchingDrives } = await supabase
    .from('drives')
    .select('drive_id')
    .ilike('company_name', companyName);

  if (!matchingDrives || matchingDrives.length === 0) return;

  for (const drive of matchingDrives) {
    // Check if application already exists
    const { data: existing } = await supabase
      .from('applications')
      .select('application_id')
      .eq('reg_number', regNumber)
      .eq('drive_id', drive.drive_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('applications').insert({
        reg_number: regNumber,
        drive_id: drive.drive_id,
        is_eligible: true,
      });
    }
  }
}

export async function updatePlacement(
  regNumber: string,
  updates: { status: PlacementStatus; company_name?: string | null; package_lpa?: number | null; placed_date?: string | null; change_reason?: string },
  userId: string
): Promise<void> {
  // Get current status for change log
  const { data: current } = await supabase
    .from('placement_records')
    .select('status')
    .eq('reg_number', regNumber)
    .single();

  // Protect against reverting placed -> unplaced
  if (current?.status === 'placed' && updates.status === 'unplaced') {
    throw new Error('Cannot revert a student from Placed to Unplaced. Please use Offer Revoked or another applicable status.');
  }

  // Update placement record
  const { error } = await supabase
    .from('placement_records')
    .update({
      status: updates.status,
      company_name: updates.company_name,
      package_lpa: updates.package_lpa,
      placed_date: updates.placed_date,
      change_reason: updates.change_reason,
      updated_by: userId,
    })
    .eq('reg_number', regNumber);
  if (error) throw error;

  // Insert change log
  await supabase.from('placement_change_log').insert({
    reg_number: regNumber,
    old_status: (current?.status as PlacementStatus) ?? null,
    new_status: updates.status,
    reason: updates.change_reason ?? null,
    changed_by: userId,
  });

  // If placed, ensure the student appears under the matching drive
  if (updates.status === 'placed' && updates.company_name) {
    await ensureApplicationForPlacement(regNumber, updates.company_name);
  }

}

// ── Applications ───────────────────────────────────────────────────────────────

export async function applyToDrive(regNumber: string, driveId: string, isEligible: boolean): Promise<void> {
  const { error } = await supabase.from('applications').insert({
    reg_number: regNumber,
    drive_id: driveId,
    is_eligible: isEligible,
  });
  if (error) {
    if (error.code === '23505') throw new Error('Already applied to this drive');
    throw error;
  }
}

// ── Individual Student ──────────────────────────────────────────────────────────

export async function checkStudentExists(regNumber: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('students')
    .select('reg_number')
    .eq('reg_number', regNumber)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function addStudentAndPlacement(student: Omit<Student, 'user_id'>, userId: string): Promise<void> {
  const exists = await checkStudentExists(student.reg_number);
  if (exists) {
    throw new Error('A student with this Roll Number already exists');
  }

  const { error: studentError } = await supabase
    .from('students')
    .insert(student);
  
  if (studentError) {
    if (studentError.code === '23505') {
      throw new Error('A student with this Roll Number already exists');
    }
    throw studentError;
  }

  const { error: placementError } = await supabase
    .from('placement_records')
    .insert({
      reg_number: student.reg_number,
      status: 'unplaced',
      updated_by: userId
    });
    
  if (placementError) throw placementError;
}

export async function markNotInterested(regNumber: string, reason: string, userId: string): Promise<void> {
  // Update placement status and log change
  await updatePlacement(regNumber, { status: 'not_interested', change_reason: reason }, userId);

  // Auto-withdraw from all applications
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('reg_number', regNumber);
    
  if (error) throw error;
}

export async function unmarkNotInterested(regNumber: string, userId: string): Promise<void> {
  await updatePlacement(regNumber, { status: 'unplaced', change_reason: 'Reverting Not Interested status' }, userId);
}

export async function blacklistStudent(regNumber: string, reason: string, userId: string): Promise<void> {
  await updatePlacement(regNumber, { status: 'blacklisted', change_reason: reason }, userId);

  // Find active applications to know which drives are affected
  const { data: apps } = await supabase
    .from('applications')
    .select('drive_id')
    .eq('reg_number', regNumber);

  if (apps && apps.length > 0) {
    const driveIds = apps.map(a => a.drive_id);
    await supabase.from('applications').delete().eq('reg_number', regNumber);

    for (const dId of driveIds) {
      await supabase.from('drives').update({ shortlist_stale: true }).eq('drive_id', dId);
    }
  }
}

export async function unblacklistStudent(regNumber: string, userId: string): Promise<void> {
  await updatePlacement(regNumber, { status: 'unplaced', change_reason: 'Reverting Blacklist status' }, userId);
}

// ── Bulk operations ────────────────────────────────────────────────────────────

export async function bulkInsertStudents(students: Omit<Student, 'user_id'>[]): Promise<{ inserted: number; duplicates: string[] }> {
  const duplicates: string[] = [];
  let inserted = 0;

  // First, find which reg_numbers already exist so we can report them as duplicates
  const regNumbers = students.map(s => s.reg_number);
  const existingSet = new Set<string>();
  for (let i = 0; i < regNumbers.length; i += 50) {
    const batch = regNumbers.slice(i, i + 50);
    const { data: existing } = await supabase
      .from('students')
      .select('reg_number')
      .in('reg_number', batch);
    if (existing) existing.forEach(e => existingSet.add(e.reg_number));
  }

  duplicates.push(...students
    .filter(s => existingSet.has(s.reg_number))
    .map(s => s.reg_number)
  );

  // Filter out duplicates and insert only new students
  const newStudents = students.filter(s => !existingSet.has(s.reg_number));

  for (let i = 0; i < newStudents.length; i += 50) {
    const batch = newStudents.slice(i, i + 50);
    const { data, error } = await supabase
      .from('students')
      .insert(batch)
      .select();

    if (error) throw error;
    if (data) inserted += data.length;
  }

  return { inserted, duplicates };
}

export async function bulkDeleteStudents(regNumbers: string[]): Promise<void> {
  // Delete in batches
  for (let i = 0; i < regNumbers.length; i += 50) {
    const batch = regNumbers.slice(i, i + 50);
    const { error } = await supabase
      .from('students')
      .delete()
      .in('reg_number', batch);
    if (error) throw error;
  }
}

export async function deleteStudentsByFilter(filters: {
  branch?: string;
  batch_year?: number;
  section?: string;
}): Promise<number> {
  if (!filters.branch && !filters.batch_year && !filters.section) {
    throw new Error('At least one filter is required to prevent accidental full deletion');
  }

  let query = supabase.from('students').delete();

  if (filters.branch) query = query.eq('branch', filters.branch);
  if (filters.batch_year) query = query.eq('batch_year', filters.batch_year);
  if (filters.section) query = query.eq('section', filters.section);

  const { data, error } = await query.select();
  if (error) throw error;
  return data?.length ?? 0;
}

// ── Bulk placement status update ───────────────────────────────────────────────

export async function bulkUpdatePlacementStatus(
  updates: Array<{ reg_number: string; status: PlacementStatus; company_name?: string | null }>
): Promise<{ updated: number; failed: string[] }> {
  let updated = 0;
  const failed: string[] = [];

  for (const u of updates) {
    // Upsert into placement_records
    const { error } = await supabase
      .from('placement_records')
      .upsert(
        {
          reg_number: u.reg_number,
          status: u.status,
          company_name: u.company_name ?? null,
          placed_date: u.status === 'placed' ? new Date().toISOString().split('T')[0] : null,
        },
        { onConflict: 'reg_number' }
      );

    if (error) {
      failed.push(u.reg_number);
    } else {
      updated++;
      // Auto-link to matching drive if placed
      if (u.status === 'placed' && u.company_name) {
        await ensureApplicationForPlacement(u.reg_number, u.company_name);
      }
    }
  }

  return { updated, failed };
}
