import { useMemo } from 'react';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { checkEligibility, STATUS_LABELS } from '@/data/mockData';
import { applyToDrive } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { usePlacementData } from '@/hooks/usePlacementData';

export default function StudentPortal() {
  const { user } = useAuth();
  const { students, placements, drives, applications, loading, invalidateAll } = usePlacementData();

  const regNumber = user?.reg_number ?? '';
  const student = students.find(s => s.reg_number === regNumber);
  const placement = placements.find(p => p.reg_number === regNumber);
  const myApplications = applications.filter(a => a.reg_number === regNumber);

  const availableDrives = useMemo(() => {
    if (!student || !placement) return [];
    return drives.filter(d => d.is_active).map(d => {
      const result = checkEligibility(student, placement, d);
      const applied = myApplications.some(a => a.drive_id === d.drive_id);
      return { ...d, ...result, applied };
    });
  }, [student, placement, drives, myApplications]);

  const handleApply = async (driveId: string, eligible: boolean) => {
    try {
      await applyToDrive(regNumber, driveId, eligible);
      toast.success('Applied successfully');
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to apply';
      toast.error(message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!student || !placement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <GraduationCap className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Profile Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          Your account ({user?.email}) is not linked to a student profile yet. Please contact the Training & Placement Cell to get registered in the system.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {student.name}</h1>
        <p className="text-sm text-muted-foreground">{student.reg_number} · {student.branch} · Batch {student.batch_year}</p>
      </div>

      {/* Status Card */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Status</p>
            <div className="mt-1"><StatusBadge status={placement.status} /></div>
          </div>
          {placement.company_name && (
            <div className="text-right">
              <p className="font-medium text-foreground">{placement.company_name}</p>
              <p className="text-sm text-muted-foreground">{placement.package_lpa} LPA</p>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-muted-foreground">CGPA</p><p className="font-medium">{student.cgpa}</p></div>
          <div><p className="text-muted-foreground">Email</p><p className="font-medium">{student.email}</p></div>
          <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{student.phone ?? '—'}</p></div>
        </div>
      </div>

      <Tabs defaultValue="drives">
        <TabsList>
          <TabsTrigger value="drives">Available Drives ({availableDrives.length})</TabsTrigger>
          <TabsTrigger value="applications">My Applications ({myApplications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="drives" className="space-y-3 mt-4">
          {availableDrives.map(d => (
            <div key={d.drive_id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{d.company_name}</h3>
                  {d.description && <p className="text-sm text-muted-foreground mt-1">{d.description}</p>}
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    <p>Drive Date: {new Date(d.drive_date).toLocaleDateString()}</p>
                    <p>Deadline: {new Date(d.registration_deadline).toLocaleDateString()}</p>
                    <p>Min CGPA: {d.eligibility_criteria.min_cgpa}</p>
                  </div>
                </div>
                <div className="text-right">
                  {d.applied ? (
                    <span className="text-xs font-medium text-[hsl(var(--status-placed))]">Applied ✓</span>
                  ) : d.eligible ? (
                    <Button size="sm" onClick={() => handleApply(d.drive_id, true)}>Apply</Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" disabled>Not Eligible</Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{d.reason}</p></TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          ))}
          {availableDrives.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No active drives available</p>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-3 mt-4">
          {myApplications.map(a => {
            const drive = drives.find(d => d.drive_id === a.drive_id);
            return (
              <div key={a.application_id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{drive?.company_name ?? 'Unknown Drive'}</p>
                    <p className="text-xs text-muted-foreground">Applied: {new Date(a.applied_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-medium ${a.is_eligible ? 'text-[hsl(var(--status-placed))]' : 'text-destructive'}`}>
                    {a.is_eligible ? 'Eligible' : 'Not Eligible'}
                  </span>
                </div>
              </div>
            );
          })}
          {myApplications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No applications yet</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
