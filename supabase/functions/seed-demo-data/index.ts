import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: string[] = [];

    // Create demo users
    const demoUsers = [
      { email: 'admin@iiitranchi.ac.in', password: 'admin123', name: 'Admin User', role: 'admin' },
      { email: 'coord@iiitranchi.ac.in', password: 'coord123', name: 'Coordinator', role: 'coordinator' },
      { email: 'aarav.sharma@iiitranchi.ac.in', password: 'student123', name: 'Aarav Sharma', role: 'student', reg_number: '2025BCSE001' },
    ];

    for (const u of demoUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);

      let userId: string;
      if (existing) {
        userId = existing.id;
        results.push(`User ${u.email} already exists`);
      } else {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { name: u.name, role: u.role },
        });
        if (authError) { results.push(`Error creating ${u.email}: ${authError.message}`); continue; }
        userId = authUser.user.id;
        results.push(`Created user ${u.email}`);
      }

      // Ensure profile exists
      await supabase.from('profiles').upsert({
        id: userId,
        name: u.name,
        email: u.email,
        role: u.role,
        reg_number: u.reg_number || null,
      });

      // Assign role
      const appRole = u.role as 'admin' | 'coordinator' | 'student';
      await supabase.from('user_roles').upsert(
        { user_id: userId, role: appRole },
        { onConflict: 'user_id,role' }
      );
    }

    // Seed sample students
    const sampleStudents = [
      { reg_number: '2025BCSE001', name: 'Aarav Sharma', branch: 'CSE', batch_year: 2025, email: 'aarav.sharma@iiitranchi.ac.in', phone: '9876543210', cgpa: 8.5, section: 'A' },
      { reg_number: '2025BCSE002', name: 'Priya Patel', branch: 'CSE', batch_year: 2025, email: 'priya.patel@iiitranchi.ac.in', phone: '9876543211', cgpa: 9.1, section: 'A' },
      { reg_number: '2025BCSE003', name: 'Rohan Kumar', branch: 'CSE', batch_year: 2025, email: 'rohan.kumar@iiitranchi.ac.in', phone: '9876543212', cgpa: 7.8, section: 'B' },
      { reg_number: '2025BECE001', name: 'Sneha Gupta', branch: 'ECE', batch_year: 2025, email: 'sneha.gupta@iiitranchi.ac.in', phone: '9876543213', cgpa: 8.9, section: 'A' },
      { reg_number: '2025BECE002', name: 'Vikram Singh', branch: 'ECE', batch_year: 2025, email: 'vikram.singh@iiitranchi.ac.in', phone: '9876543214', cgpa: 7.2, section: 'A' },
      { reg_number: '2025BEE001', name: 'Ananya Reddy', branch: 'EE', batch_year: 2025, email: 'ananya.reddy@iiitranchi.ac.in', phone: '9876543215', cgpa: 8.0, section: 'A' },
      { reg_number: '2025BEE002', name: 'Karthik Nair', branch: 'EE', batch_year: 2025, email: 'karthik.nair@iiitranchi.ac.in', phone: '9876543216', cgpa: 7.5, section: 'A' },
      { reg_number: '2025BCSE004', name: 'Meera Joshi', branch: 'CSE', batch_year: 2025, email: 'meera.joshi@iiitranchi.ac.in', phone: '9876543217', cgpa: 9.3, section: 'B' },
    ];

    const { error: studentsError } = await supabase
      .from('students')
      .upsert(sampleStudents, { onConflict: 'reg_number' });

    if (studentsError) {
      results.push(`Students error: ${studentsError.message}`);
    } else {
      results.push(`Upserted ${sampleStudents.length} sample students`);
    }

    // Seed some placements
    const placementUpdates = [
      { reg_number: '2025BCSE002', status: 'placed', company_name: 'Google', package_lpa: 45, placed_date: '2025-03-01' },
      { reg_number: '2025BECE001', status: 'placed', company_name: 'Microsoft', package_lpa: 38, placed_date: '2025-02-15' },
      { reg_number: '2025BCSE004', status: 'placed', company_name: 'Amazon', package_lpa: 42, placed_date: '2025-03-05' },
      { reg_number: '2025BCSE003', status: 'offer_pending', company_name: 'Flipkart', package_lpa: 22 },
    ];

    for (const p of placementUpdates) {
      await supabase
        .from('placement_records')
        .update(p)
        .eq('reg_number', p.reg_number);
    }
    results.push('Updated placement records');

    // Seed a sample drive
    const { error: driveError } = await supabase.from('drives').upsert({
      company_name: 'TCS',
      description: 'TCS NQT Drive for 2025 batch',
      drive_date: '2025-04-15',
      registration_deadline: '2025-04-10',
      is_active: true,
      eligibility_criteria: {
        min_cgpa: 6.0,
        allowed_branches: ['CSE', 'ECE', 'EE'],
        batch_year: 2025,
        allowed_statuses: ['unplaced', 'eligible_for_upgrade'],
      },
    }, { onConflict: 'drive_id' });

    if (driveError) results.push(`Drive error: ${driveError.message}`);
    else results.push('Created sample drive');

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
