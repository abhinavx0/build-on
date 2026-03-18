
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'student');

-- Create placement status enum
CREATE TYPE public.placement_status AS ENUM ('unplaced', 'placed', 'offer_pending', 'offer_revoked', 'eligible_for_upgrade');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  reg_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles RLS policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create students table
CREATE TABLE public.students (
  reg_number TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  batch_year INTEGER NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cgpa NUMERIC(4,2) NOT NULL,
  section TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Admins can update students" ON public.students FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Admins can delete students" ON public.students FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create placement_records table
CREATE TABLE public.placement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_number TEXT NOT NULL REFERENCES public.students(reg_number) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unplaced',
  company_name TEXT,
  package_lpa NUMERIC(6,2),
  placed_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  UNIQUE(reg_number)
);

ALTER TABLE public.placement_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view placements" ON public.placement_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert placements" ON public.placement_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Admins can update placements" ON public.placement_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Admins can delete placements" ON public.placement_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create drives table
CREATE TABLE public.drives (
  drive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  description TEXT,
  eligibility_criteria JSONB NOT NULL DEFAULT '{}',
  drive_date DATE NOT NULL,
  registration_deadline DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  shortlist_stale BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drives" ON public.drives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert drives" ON public.drives FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Admins can update drives" ON public.drives FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Admins can delete drives" ON public.drives FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create applications table
CREATE TABLE public.applications (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_number TEXT NOT NULL REFERENCES public.students(reg_number) ON DELETE CASCADE,
  drive_id UUID NOT NULL REFERENCES public.drives(drive_id) ON DELETE CASCADE,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_eligible BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(reg_number, drive_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view applications" ON public.applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update applications" ON public.applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Admins can delete applications" ON public.applications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create placement_change_log table
CREATE TABLE public.placement_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_number TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.placement_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view change log" ON public.placement_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert change log" ON public.placement_change_log FOR INSERT TO authenticated WITH CHECK (true);

-- Create trigger for auto-creating placement record when student is inserted
CREATE OR REPLACE FUNCTION public.auto_create_placement_record()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.placement_records (reg_number, status, updated_at)
  VALUES (NEW.reg_number, 'unplaced', now())
  ON CONFLICT (reg_number) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_placement_on_student_insert
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_placement_record();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
