import { useState, useMemo } from 'react';
import { type PlacementStatus, STATUS_LABELS, type PlacementRecord, type Student } from '@/data/mockData';
import { updatePlacement, bulkDeleteStudents, unmarkNotInterested, unblacklistStudent } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { ExcelUploadDialog } from '@/components/ExcelUploadDialog';
import { BulkDeleteDialog } from '@/components/BulkDeleteDialog';
import { AddStudentDialog } from '@/components/AddStudentDialog';
import { NotInterestedDialog } from '@/components/NotInterestedDialog';
import { BlacklistDialog } from '@/components/BlacklistDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Upload, Trash2, Filter, Download, Pencil, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { usePlacementData } from '@/hooks/usePlacementData';

type StudentWithStatus = Student & PlacementRecord;

export default function StudentsPage() {
  const { isAdmin, user } = useAuth();
  const { students, placements, loading, invalidateAll } = usePlacementData();

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<StudentWithStatus | null>(null);

  // Bulk upload
  const [uploadOpen, setUploadOpen] = useState(false);

  // Add individual student
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  // Bulk delete
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);

  // Not Interested
  const [notInterestedOpen, setNotInterestedOpen] = useState(false);
  const [notInterestedReg, setNotInterestedReg] = useState('');
  const [notInterestedName, setNotInterestedName] = useState('');

  // Blacklist
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [blacklistReg, setBlacklistReg] = useState('');
  const [blacklistName, setBlacklistName] = useState('');
  const [blacklistCurrentStatus, setBlacklistCurrentStatus] = useState<PlacementStatus | ''>('');

  // Mark placement
  const [markModal, setMarkModal] = useState(false);
  const [markReg, setMarkReg] = useState('');
  const [markCompany, setMarkCompany] = useState('');
  const [markPackage, setMarkPackage] = useState('');
  const [markStatus, setMarkStatus] = useState<PlacementStatus>('placed');

  const data = useMemo(() => {
    return students.map(s => {
      const p = placements.find(p => p.reg_number === s.reg_number);
      if (!p) return null;
      return { ...s, ...p } as StudentWithStatus;
    }).filter((s): s is StudentWithStatus => {
      if (!s) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.reg_number.toLowerCase().includes(search.toLowerCase())) return false;
      if (branchFilter !== 'all' && s.branch !== branchFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [search, branchFilter, statusFilter, students, placements]);

  const branches = Array.from(new Set<string>(students.map(s => s.branch)));
  const batchYears = Array.from(new Set<number>(students.map(s => s.batch_year))).sort();
  const sections = Array.from(new Set<string>(students.filter(s => s.section).map(s => s.section!))).sort();

  const handleMarkPlacement = async () => {
    if (!markReg || !user) return;
    if (markStatus === 'placed' && !markCompany) {
      toast.error('Company name is required for placed students');
      return;
    }
    try {
      await updatePlacement(markReg, {
        status: markStatus,
        company_name: markStatus === 'placed' ? markCompany : null,
        package_lpa: markStatus === 'placed' && markPackage ? Number(markPackage) : null,
        placed_date: markStatus === 'placed' ? new Date().toISOString().split('T')[0] : null,
      }, user.id);
      toast.success(`Marked ${markReg} as ${STATUS_LABELS[markStatus]}`);
      setMarkModal(false);
      setMarkReg(''); setMarkCompany(''); setMarkPackage('');
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update placement';
      toast.error(message);
    }
  };

  const toggleRow = (regNumber: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(regNumber)) next.delete(regNumber);
      else next.add(regNumber);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(s => s.reg_number)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    setDeletingSelected(true);
    try {
      await bulkDeleteStudents([...selectedRows]);
      toast.success(`Deleted ${selectedRows.size} students`);
      setSelectedRows(new Set());
      invalidateAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete students';
      toast.error(message);
    } finally {
      setDeletingSelected(false);
    }
  };

  const handleExportCSV = (exportData: typeof data, filename: string) => {
    if (exportData.length === 0) {
      toast.error('No students to export');
      return;
    }

    const escapeCSV = (value: string | number | null | undefined): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Reg Number', 'Name', 'Branch', 'Batch Year', 'Section',
      'CGPA', 'Email', 'Phone', 'Status', 'Company', 'Package (LPA)'
    ];

    const rows = exportData.map(s => [
      s.reg_number,
      s.name,
      s.branch,
      s.batch_year,
      s.section || '',
      s.cgpa,
      s.email,
      s.phone || '',
      s.status,
      s.company_name || '',
      s.package_lpa || ''
    ].map(escapeCSV));

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Export successful');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Database</h1>
          <p className="text-sm text-muted-foreground">{data.length} students</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAddStudentOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Add Student
            </Button>
            <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" /> Upload Excel
            </Button>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(true)} className="gap-2">
              <Filter className="h-4 w-4" /> Filter Delete
            </Button>
            {selectedRows.size > 0 && (
              <Button variant="destructive" onClick={handleDeleteSelected} disabled={deletingSelected} className="gap-2">
                <Trash2 className="h-4 w-4" /> Delete ({selectedRows.size})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportCSV(data, 'students_current_view.csv')}>
                  Export Current View ({data.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV(data.filter(s => s.status === 'placed'), 'students_placed.csv')}>
                  Export Placed Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV(data.filter(s => s.status === 'unplaced'), 'students_unplaced.csv')}>
                  Export Unplaced Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setMarkModal(true)}>Mark Placement</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or roll number…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Student Table */}
      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedRows.size === data.length && data.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              <TableHead>Reg Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>CGPA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Package</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(s => (
              <TableRow key={s.reg_number} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(s)}>
                {isAdmin && (
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRows.has(s.reg_number)}
                      onCheckedChange={() => toggleRow(s.reg_number)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono text-xs">{s.reg_number}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.branch}</TableCell>
                <TableCell>{s.cgpa}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell>{s.company_name ?? '—'}</TableCell>
                <TableCell>{s.package_lpa ? `${s.package_lpa} LPA` : '—'}</TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Reg Number</p><p className="font-mono">{selected.reg_number}</p></div>
              <div><p className="text-muted-foreground">Branch</p><p>{selected.branch}</p></div>
              <div><p className="text-muted-foreground">CGPA</p><p>{selected.cgpa}</p></div>
              <div><p className="text-muted-foreground">Batch</p><p>{selected.batch_year}</p></div>
              <div><p className="text-muted-foreground">Email</p><p>{selected.email}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p>{selected.phone ?? '—'}</p></div>
              <div className="col-span-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground">Placement Status</p>
                    <StatusBadge status={selected.status} />
                    {selected.company_name && (
                      <p className="mt-1 text-foreground">{selected.company_name} — {selected.package_lpa} LPA</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-2 items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMarkReg(selected.reg_number);
                          setMarkStatus(selected.status);
                          setMarkCompany(selected.company_name || '');
                          setMarkPackage(selected.package_lpa?.toString() || '');
                          setSelected(null);
                          setMarkModal(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Placement
                      </Button>
                      
                      {selected.status === 'not_interested' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!user) return;
                            try {
                              await unmarkNotInterested(selected.reg_number, user.id);
                              toast.success('Status reverted to unplaced');
                              setSelected(null);
                              invalidateAll();
                            } catch (e: unknown) {
                              const message = e instanceof Error ? e.message : 'Failed to revert status';
                              toast.error(message);
                            }
                          }}
                        >
                          Revert Not Interested
                        </Button>
                      ) : selected.status === 'blacklisted' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!user) return;
                            try {
                              await unblacklistStudent(selected.reg_number, user.id);
                              toast.success('Student un-blacklisted');
                              setSelected(null);
                              invalidateAll();
                            } catch (e: unknown) {
                              const message = e instanceof Error ? e.message : 'Failed to un-blacklist';
                              toast.error(message);
                            }
                          }}
                        >
                          Un-blacklist Student
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => {
                              setNotInterestedReg(selected.reg_number);
                              setNotInterestedName(selected.name);
                              setSelected(null);
                              setNotInterestedOpen(true);
                            }}
                          >
                            Mark Not Interested
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive shadow-sm"
                            onClick={() => {
                              setBlacklistReg(selected.reg_number);
                              setBlacklistName(selected.name);
                              setBlacklistCurrentStatus(selected.status);
                              setSelected(null);
                              setBlacklistOpen(true);
                            }}
                          >
                            Blacklist
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark Placement Dialog */}
      <Dialog open={markModal} onOpenChange={setMarkModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Placement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student Reg Number</Label>
              <Input value={markReg} onChange={e => setMarkReg(e.target.value)} placeholder="e.g. 2021BCSE001" className="font-mono" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={markStatus} onValueChange={v => setMarkStatus(v as PlacementStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {markStatus === 'placed' && (
              <>
                <div>
                  <Label>Company Name</Label>
                  <Input value={markCompany} onChange={e => setMarkCompany(e.target.value)} placeholder="e.g. Google" />
                </div>
                <div>
                  <Label>Package (LPA)</Label>
                  <Input type="number" value={markPackage} onChange={e => setMarkPackage(e.target.value)} placeholder="e.g. 25" />
                </div>
              </>
            )}
            <Button onClick={handleMarkPlacement} className="w-full">Confirm Placement</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excel Upload Dialog */}
      <ExcelUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={invalidateAll} />

      {/* Add Student Dialog */}
      <AddStudentDialog open={addStudentOpen} onOpenChange={setAddStudentOpen} onSuccess={invalidateAll} />

      {/* Not Interested Dialog */}
      <NotInterestedDialog
        open={notInterestedOpen}
        onOpenChange={setNotInterestedOpen}
        regNumber={notInterestedReg}
        studentName={notInterestedName}
        onSuccess={invalidateAll}
      />

      {/* Blacklist Dialog */}
      <BlacklistDialog
        open={blacklistOpen}
        onOpenChange={setBlacklistOpen}
        regNumber={blacklistReg}
        studentName={blacklistName}
        currentStatus={blacklistCurrentStatus}
        onSuccess={invalidateAll}
      />

      {/* Bulk Delete by Filter Dialog */}
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onSuccess={invalidateAll}
        branches={branches}
        batchYears={batchYears}
        sections={sections}
      />
    </div>
  );
}
