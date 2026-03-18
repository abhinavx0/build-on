import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { checkStudentExists, addStudentAndPlacement } from '@/lib/api';

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddStudentDialog({ open, onOpenChange, onSuccess }: AddStudentDialogProps) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    reg_number: '',
    name: '',
    branch: '',
    batch_year: '',
    email: '',
    phone: '',
    cgpa: '',
    section: ''
  });

  const [checkingRoll, setCheckingRoll] = useState(false);
  const [rollError, setRollError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRollBlur = useCallback(async () => {
    if (!formData.reg_number) {
      setRollError('');
      return;
    }
    
    setCheckingRoll(true);
    setRollError('');
    try {
      const exists = await checkStudentExists(formData.reg_number);
      if (exists) {
        setRollError('A student with this Roll Number already exists.');
      }
    } catch (err: any) {
      console.error(err);
      setRollError('Failed to verify Roll Number.');
    } finally {
      setCheckingRoll(false);
    }
  }, [formData.reg_number]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validation
    if (rollError) {
      toast.error('Please fix validation errors before submitting.');
      return;
    }
    
    const cgpaNum = Number(formData.cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      toast.error('CGPA must be a valid number between 0 and 10.');
      return;
    }

    const batchYearNum = Number(formData.batch_year);
    if (isNaN(batchYearNum) || batchYearNum < 2000 || batchYearNum > 2100) {
      toast.error('Batch Year must be a reasonable 4-digit year.');
      return;
    }

    if (!formData.reg_number || !formData.name || !formData.branch || !formData.email) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await addStudentAndPlacement({
        reg_number: formData.reg_number,
        name: formData.name,
        branch: formData.branch,
        batch_year: batchYearNum,
        email: formData.email,
        phone: formData.phone || null,
        cgpa: cgpaNum,
        section: formData.section || null,
      }, user.id);
      
      toast.success('Student added successfully.');
      onSuccess();
      onOpenChange(false);
      setFormData({
        reg_number: '',
        name: '',
        branch: '',
        batch_year: '',
        email: '',
        phone: '',
        cgpa: '',
        section: ''
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to add student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reg_number">Roll Number <span className="text-destructive">*</span></Label>
            <Input
              id="reg_number"
              value={formData.reg_number}
              onChange={e => setFormData({ ...formData, reg_number: e.target.value })}
              onBlur={handleRollBlur}
              placeholder="e.g. 2021BCSE001"
              className={rollError ? "border-destructive" : ""}
              required
            />
            {checkingRoll && <p className="text-xs text-muted-foreground">Checking availability...</p>}
            {rollError && <p className="text-xs text-destructive">{rollError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Student Name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch <span className="text-destructive">*</span></Label>
              <Input
                id="branch"
                value={formData.branch}
                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                placeholder="e.g. CSE"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch_year">Batch Year <span className="text-destructive">*</span></Label>
              <Input
                id="batch_year"
                type="number"
                value={formData.batch_year}
                onChange={e => setFormData({ ...formData, batch_year: e.target.value })}
                placeholder="e.g. 2025"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cgpa">CGPA <span className="text-destructive">*</span></Label>
              <Input
                id="cgpa"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={formData.cgpa}
                onChange={e => setFormData({ ...formData, cgpa: e.target.value })}
                placeholder="e.g. 8.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit number"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Input
              id="section"
              value={formData.section}
              onChange={e => setFormData({ ...formData, section: e.target.value })}
              placeholder="e.g. A"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || checkingRoll || !!rollError}>
              {submitting ? 'Adding...' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
