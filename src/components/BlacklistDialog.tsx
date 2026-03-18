import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { blacklistStudent } from '@/lib/api';
import { PlacementStatus } from '@/data/mockData';

interface BlacklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regNumber: string;
  studentName: string;
  currentStatus: PlacementStatus | '';
  onSuccess: () => void;
}

export function BlacklistDialog({ open, onOpenChange, regNumber, studentName, currentStatus, onSuccess }: BlacklistDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const isPlacedInfo = currentStatus === 'placed' || currentStatus === 'offer_pending';

  const handleNext = () => {
    if (reason.length < 20) {
      toast.error('Please provide a detailed reason (minimum 20 characters).');
      return;
    }
    setConfirmStep(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !regNumber) return;

    setSubmitting(true);
    try {
      await blacklistStudent(regNumber, reason, user.id);
      toast.success(`${studentName} has been blacklisted.`);
      onSuccess();
      onOpenChange(false);
      
      // reset form
      setTimeout(() => {
        setReason('');
        setConfirmStep(false);
      }, 500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to blacklist student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => {
      onOpenChange(open);
      if (!open) {
        setTimeout(() => {
          setConfirmStep(false);
          setReason('');
        }, 300);
      }
    }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            Blacklist Student
          </DialogTitle>
        </DialogHeader>

        {!confirmStep ? (
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to blacklist <strong>{studentName} ({regNumber})</strong>.
              This action will auto-withdraw all active applications and flag affected drives as stale.
            </p>

            {isPlacedInfo && (
              <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-md text-sm font-semibold">
                ⚠️ WARNING: This student is currently marked as Placed or Pending Offer. Blacklisting them will override their placement status.
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason for Blacklisting</Label>
              <Textarea
                placeholder="Detailed reason for blacklisting..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {reason.length}/20 min chars
              </p>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={handleNext} disabled={reason.length < 20}>
                Next Steps
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-2 space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md space-y-3">
              <p className="text-sm font-bold text-destructive uppercase tracking-wide">Final Confirmation</p>
              <p className="text-sm text-foreground">
                Please confirm that you want to permanently blacklist <strong>{studentName}</strong> from all placement activities.
              </p>
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/50 pl-3">
                "{reason}"
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmStep(false)} disabled={submitting}>
                Back
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? 'Blacklisting...' : 'Confirm Blacklist'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
