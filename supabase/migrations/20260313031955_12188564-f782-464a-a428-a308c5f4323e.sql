
-- Fix permissive INSERT policy on applications - restrict to authenticated users properly
DROP POLICY "Users can insert applications" ON public.applications;
CREATE POLICY "Authenticated users can apply to drives" ON public.applications 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix permissive INSERT policy on placement_change_log
DROP POLICY "System can insert change log" ON public.placement_change_log;
CREATE POLICY "Authenticated users can insert change log" ON public.placement_change_log 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);
