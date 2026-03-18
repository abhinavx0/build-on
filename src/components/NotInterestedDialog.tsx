import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { markNotInterested } from '@/lib/api';

interface NotInterestedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regNumber: string;
  studentName: string;
  onSuccess: () => void;
}

const REASONS = [
  'Higher Studies',
  'Off-Campus Offer',
  'Entrepreneurship',
  'Personal',
  'Other'
];

export function NotInterestedDialog({ open, onOpenChange, regNumber, studentName, onSuccess }: NotInterestedDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !regNumber) return;
    if (!reason) {
      toast.error('Please select a reason.');
      return;
    }

    setSubmitting(true);
    try {
      await markNotInterested(regNumber, reason, user.id);
      toast.success(`${studentName} marked as Not Interested.`);
      onSuccess();
      onOpenChange(false);
      setReason('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Mark Not Interested</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">
            Marking <strong>{studentName} ({regNumber})</strong> as Not Interested will remove them from the active placement pool and auto-withdraw any active applications.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !reason}>
                {submitting ? 'Updating...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
