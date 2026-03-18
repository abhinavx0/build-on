import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Filter, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteStudentsByFilter } from '@/lib/api';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  branches: string[];
  batchYears: number[];
  sections: string[];
}

export function BulkDeleteDialog({ open, onOpenChange, onSuccess, branches, batchYears, sections }: BulkDeleteDialogProps) {
  const [branch, setBranch] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [section, setSection] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const hasFilter = branch || batchYear || section;

  const handleDelete = async () => {
    if (!hasFilter) {
      toast.error('Select at least one filter');
      return;
    }
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setDeleting(true);
    try {
      const count = await deleteStudentsByFilter({
        branch: branch || undefined,
        batch_year: batchYear ? Number(batchYear) : undefined,
        section: section || undefined,
      });
      toast.success(`Deleted ${count} students`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete students');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setBranch('');
    setBatchYear('');
    setSection('');
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Delete Students by Filter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label>Branch</Label>
              <Select value={branch} onValueChange={(v) => { setBranch(v === 'all' ? '' : v); setConfirmed(false); }}>
                <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Batch Year</Label>
              <Select value={batchYear} onValueChange={(v) => { setBatchYear(v === 'all' ? '' : v); setConfirmed(false); }}>
                <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {batchYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {sections.length > 0 && (
              <div>
                <Label>Section</Label>
                <Select value={section} onValueChange={(v) => { setSection(v === 'all' ? '' : v); setConfirmed(false); }}>
                  <SelectTrigger><SelectValue placeholder="All Sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {confirmed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Are you sure?</AlertTitle>
              <AlertDescription>
                This will permanently delete all students matching the selected filters. This action cannot be undone.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!hasFilter || deleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : confirmed ? 'Yes, Delete' : 'Delete Students'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
