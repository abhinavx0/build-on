import { useState, useMemo } from 'react';
import { type Drive, type PlacementStatus, STATUS_LABELS, checkEligibility } from '@/data/mockData';
import { createDrive, updateDrive, updatePlacement, deleteDrive } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, Eye, Pencil, UserCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { usePlacementData } from '@/hooks/usePlacementData';

export default function DrivesPage() {
  const { isAdmin, user } = useAuth();
  const { students, placements, drives, applications, loading, invalidateAll } = usePlacementData();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailDrive, setDetailDrive] = useState<Drive | null>(null);
  const [editDrive, setEditDrive] = useState<Drive | null>(null);
  const [deleteDriveObj, setDeleteDriveObj] = useState<Drive | null>(null);

  // Create form
  const [formCompany, setFormCompany] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formCgpa, setFormCgpa] = useState('7.0');
  const [formBatchYear, setFormBatchYear] = useState(String(new Date().getFullYear()));
  const [formBranches, setFormBranches] = useState<string[]>(['CSE']);
  const [formStatuses, setFormStatuses] = useState<PlacementStatus[]>(['unplaced']);

  // Edit form
  const [editCompany, setEditCompany] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Student status update
  const [statusUpdateReg, setStatusUpdateReg] = useState('');
  const [statusUpdateStatus, setStatusUpdateStatus] = useState<PlacementStatus>('placed');
  const [statusUpdateCompany, setStatusUpdateCompany] = useState('');
  const [statusUpdatePackage, setStatusUpdatePackage] = useState('');
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);

  const allBranches = ['CSE', 'ECE', 'EE'];

  const handleCreate = async () => {
    if (!formCompany || !formDate) return;
    try {
      await createDrive({
        company_name: formCompany,
        description: formDesc,
        drive_date: formDate,
        registration_deadline: formDeadline || formDate,
        is_active: true,
        eligibility_criteria: {
          min_cgpa: Number(formCgpa),
          allowed_branches: formBranches,
          batch_year: Number(formBatchYear),
          allowed_statuses: formStatuses,
        },
        created_by: user?.id ?? null,
      });
      toast.success(`Drive for ${formCompany} created`);
      setCreateOpen(false);
      setFormCompany(''); setFormDesc(''); setFormDate(''); setFormDeadline('');
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create drive';
      toast.error(message);
    }
  };

  const openEditDrive = (drive: Drive) => {
    setEditDrive(drive);
    setEditCompany(drive.company_name);
    setEditDesc(drive.description || '');
    setEditDate(drive.drive_date);
    setEditDeadline(drive.registration_deadline);
    setEditActive(drive.is_active);
  };

  const handleEditDrive = async () => {
    if (!editDrive || !editCompany) return;
    try {
      await updateDrive(editDrive.drive_id, {
        company_name: editCompany,
        description: editDesc,
        drive_date: editDate,
        registration_deadline: editDeadline,
        is_active: editActive,
      });
      toast.success(`Drive for ${editCompany} updated`);
      setEditDrive(null);
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update drive';
      toast.error(message);
    }
  };

  const handleDeleteDrive = async () => {
    if (!deleteDriveObj) return;
    try {
      await deleteDrive(deleteDriveObj.drive_id);
      toast.success(`Drive ${deleteDriveObj.company_name} deleted successfully`);
      setDeleteDriveObj(null);
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete drive';
      toast.error(message);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdateReg || !user) return;
    try {
      await updatePlacement(statusUpdateReg, {
        status: statusUpdateStatus,
        company_name: statusUpdateStatus === 'placed' ? (statusUpdateCompany || detailDrive?.company_name || null) : null,
        package_lpa: statusUpdateStatus === 'placed' && statusUpdatePackage ? Number(statusUpdatePackage) : null,
        placed_date: statusUpdateStatus === 'placed' ? new Date().toISOString().split('T')[0] : null,
        change_reason: `Updated via drive: ${detailDrive?.company_name}`,
      }, user.id);
      toast.success(`Updated ${statusUpdateReg} to ${STATUS_LABELS[statusUpdateStatus]}`);
      setStatusUpdateOpen(false);
      setStatusUpdateReg(''); setStatusUpdateCompany(''); setStatusUpdatePackage('');
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(message);
    }
  };

  const driveApplicants = useMemo(() => {
    if (!detailDrive) return [];
    return applications
      .filter(a => a.drive_id === detailDrive.drive_id)
      .map(a => {
        const student = students.find(s => s.reg_number === a.reg_number);
        const placement = placements.find(p => p.reg_number === a.reg_number);
        const eligibility = student && placement ? checkEligibility(student, placement, detailDrive) : { eligible: false };
        return { ...a, student, placement, ...eligibility };
      });
  }, [detailDrive, applications, students, placements]);

  const eligibleApplicants = driveApplicants.filter(a => a.eligible);

  const exportCSV = () => {
    const escapeCSV = (value: string | number | null | undefined): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Reg Number', 'Name', 'Branch', 'Batch', 'CGPA', 'Phone', 'Email'];
    const rows = eligibleApplicants.map(a => [
      a.student?.reg_number, a.student?.name, a.student?.branch,
      a.student?.batch_year, a.student?.cgpa, a.student?.phone, a.student?.email,
    ].map(escapeCSV));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${detailDrive?.company_name}_shortlist.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Shortlist exported as CSV');
  };

  const toggleBranch = (b: string) => {
    setFormBranches(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const toggleStatus = (s: PlacementStatus) => {
    setFormStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drive Management</h1>
          <p className="text-sm text-muted-foreground">{drives.length} total drives</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Drive
          </Button>
        )}
      </div>

      {/* Drive Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {drives.map(d => (
          <div key={d.drive_id} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-foreground">{d.company_name}</h3>
                <span className={`text-xs font-medium ${d.is_active ? 'text-[hsl(var(--status-placed))]' : 'text-muted-foreground'}`}>
                  {d.is_active ? 'Active' : 'Closed'}
                </span>
              </div>
              <div className="flex gap-1">
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => openEditDrive(d)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDriveObj(d)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setDetailDrive(d)} className="gap-1">
                  <Eye className="h-4 w-4" /> View
                </Button>
              </div>
            </div>
            {d.description && <p className="text-sm text-muted-foreground mb-2">{d.description}</p>}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Drive: {new Date(d.drive_date).toLocaleDateString()}</p>
              <p>Deadline: {new Date(d.registration_deadline).toLocaleDateString()}</p>
              <p>Min CGPA: {d.eligibility_criteria.min_cgpa} · {d.eligibility_criteria.allowed_branches.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Drive Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Drive</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Company Name</Label><Input value={formCompany} onChange={e => setFormCompany(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Drive Date</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
              <div><Label>Deadline</Label><Input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min CGPA</Label><Input type="number" step="0.1" value={formCgpa} onChange={e => setFormCgpa(e.target.value)} /></div>
              <div><Label>Batch Year</Label><Input type="number" value={formBatchYear} onChange={e => setFormBatchYear(e.target.value)} placeholder="e.g. 2025" /></div>
            </div>
            <div>
              <Label>Allowed Branches</Label>
              <div className="flex gap-3 mt-1">
                {allBranches.map(b => (
                  <label key={b} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={formBranches.includes(b)} onCheckedChange={() => toggleBranch(b)} />{b}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Allowed Statuses</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={formStatuses.includes(k as PlacementStatus)} onCheckedChange={() => toggleStatus(k as PlacementStatus)} />{v}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full">Create Drive</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Drive Dialog */}
      <Dialog open={!!editDrive} onOpenChange={() => setEditDrive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Drive</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Company Name</Label><Input value={editCompany} onChange={e => setEditCompany(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Drive Date</Label><Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></div>
              <div><Label>Deadline</Label><Input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editActive} onCheckedChange={(v) => setEditActive(!!v)} />
              <Label>Drive is Active</Label>
            </div>
            <Button onClick={handleEditDrive} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDriveObj} onOpenChange={(open) => !open && setDeleteDriveObj(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Drive</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the drive for <strong>{deleteDriveObj?.company_name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This will also remove any application records tied to this drive. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDriveObj(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteDrive}>Delete Drive</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drive Detail Dialog with Student Status Updates */}
      <Dialog open={!!detailDrive} onOpenChange={() => setDetailDrive(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{detailDrive?.company_name} — Applicants</DialogTitle>
          </DialogHeader>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">
              {eligibleApplicants.length} eligible / {driveApplicants.length} total applicants
            </p>
            <div className="flex gap-2">
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setStatusUpdateOpen(true)} className="gap-1">
                  <UserCheck className="h-4 w-4" /> Update Status
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reg Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Eligible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driveApplicants.map(a => (
                <TableRow key={a.application_id}>
                  <TableCell className="font-mono text-xs">{a.reg_number}</TableCell>
                  <TableCell>{a.student?.name ?? '—'}</TableCell>
                  <TableCell>{a.student?.branch ?? '—'}</TableCell>
                  <TableCell>{a.student?.cgpa ?? '—'}</TableCell>
                  <TableCell>{a.placement ? <StatusBadge status={a.placement.status} /> : '—'}</TableCell>
                  <TableCell>
                    {a.eligible
                      ? <span className="text-[hsl(var(--status-placed))] text-xs font-medium">Eligible</span>
                      : <span className="text-destructive text-xs">{a.reason}</span>
                    }
                  </TableCell>
                </TableRow>
              ))}
              {driveApplicants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No applicants yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Update Student Status in Drive */}
      <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Student Placement Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student Reg Number</Label>
              <Input value={statusUpdateReg} onChange={e => setStatusUpdateReg(e.target.value)} placeholder="e.g. 2021BCSE001" className="font-mono" />
            </div>
            <div>
              <Label>New Status</Label>
              <Select value={statusUpdateStatus} onValueChange={v => setStatusUpdateStatus(v as PlacementStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {statusUpdateStatus === 'placed' && (
              <>
                <div>
                  <Label>Company</Label>
                  <Input value={statusUpdateCompany} onChange={e => setStatusUpdateCompany(e.target.value)} placeholder={detailDrive?.company_name} />
                </div>
                <div>
                  <Label>Package (LPA)</Label>
                  <Input type="number" value={statusUpdatePackage} onChange={e => setStatusUpdatePackage(e.target.value)} />
                </div>
              </>
            )}
            <Button onClick={handleStatusUpdate} className="w-full">Update Status</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
