-- C3 Fix: Add missing placement status values to the enum
-- The frontend uses 'not_interested' and 'blacklisted' statuses but the DB enum only has 5 values.
-- The placement_records.status column is TEXT (not the enum type), so this is for consistency.

ALTER TYPE public.placement_status ADD VALUE IF NOT EXISTS 'not_interested';
ALTER TYPE public.placement_status ADD VALUE IF NOT EXISTS 'blacklisted';

-- C4 Fix: Allow coordinators to delete applications (needed for markNotInterested/blacklistStudent)
DROP POLICY IF EXISTS "Admins can delete applications" ON public.applications;
CREATE POLICY "Admins and coordinators can delete applications" ON public.applications
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );
