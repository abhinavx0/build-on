import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { bulkInsertStudents, bulkUpdatePlacementStatus } from '@/lib/api';
import { PlacementStatus, STATUS_LABELS } from '@/data/mockData';
import type { Student } from '@/data/mockData';

interface ExcelRow {
  name?: string;
  roll_number?: string;
  reg_number?: string;
  branch?: string;
  cgpa?: number;
  email?: string;
  phone?: string;
  batch_year?: number;
  batch?: number;
  year?: number;
  section?: string;
  placement_status?: string;
  company_name?: string;
  company?: string;
}

interface ParsedStudent {
  data: Omit<Student, 'user_id'>;
  placement_status?: PlacementStatus;
  company_name?: string;
  errors: string[];
  row: number;
}

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MANDATORY_COLUMNS = ['name', 'reg_number', 'branch', 'phone', 'batch_year'];

function normalizeColumnName(col: string): string {
  const normalized = col.toLowerCase().trim().replace(/[\s\/]+/g, '_');
  const mappings: Record<string, string> = {
    'roll_number': 'reg_number',
    'rollnumber': 'reg_number',
    'roll_no': 'reg_number',
    'rollno': 'reg_number',
    'registration_number': 'reg_number',
    'reg_no': 'reg_number',
    'batch': 'batch_year',
    'year': 'batch_year',
    'batch_year': 'batch_year',
    'status': 'placement_status',
    'placement_status': 'placement_status',
    'placement status': 'placement_status',
    'company': 'company_name',
    'company_name': 'company_name',
    'company name': 'company_name',
  };
  return mappings[normalized] || normalized;
}

function validateRow(row: ExcelRow, rowIndex: number): ParsedStudent {
  const errors: string[] = [];
  const regNumber = row.reg_number || row.roll_number || '';
  const name = row.name || '';
  const branch = row.branch || '';
  const email = row.email || '';
  const batchYear = row.batch_year || row.batch || row.year || 0;
  const cgpa = Number(row.cgpa) || 0;
  const phone = row.phone ? String(row.phone).trim() : null;
  const section = row.section ? String(row.section).trim() : null;
  const rawStatus = row.placement_status ? String(row.placement_status).toLowerCase().trim().replace(/\s+/g, '_') : null;
  const companyName = row.company_name || row.company || null;

  if (!name) errors.push('Name is required');
  if (!regNumber) errors.push('Roll Number is required');
  if (!branch) errors.push('Branch is required');
  if (!phone) errors.push('Phone Number is required');
  if (!batchYear) errors.push('Batch Year is required');
  
  if (cgpa < 0 || cgpa > 10) errors.push('CGPA must be between 0 and 10');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');

  let placement_status: PlacementStatus | undefined;
  if (rawStatus) {
    if (Object.keys(STATUS_LABELS).includes(rawStatus)) {
      placement_status = rawStatus as PlacementStatus;
    } else {
      errors.push(`Invalid placement status: ${rawStatus}`);
    }
  }

  return {
    data: {
      reg_number: String(regNumber).trim(),
      name: String(name).trim(),
      branch: String(branch).trim().toUpperCase(),
      batch_year: Number(batchYear),
      email: email ? String(email).trim().toLowerCase() : `${String(regNumber).trim().toLowerCase()}@student.edu`, // Optional, fallback if needed
      phone: phone,
      cgpa: cgpa || 0, // Optional fallback
      section: section,
    },
    placement_status,
    company_name: companyName ? String(companyName).trim() : undefined,
    errors,
    row: rowIndex + 2, // +2 for 1-indexed + header row
  };
}

export function ExcelUploadDialog({ open, onOpenChange, onSuccess }: ExcelUploadDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const validRows = useMemo(() => parsedData.filter(r => r.errors.length === 0), [parsedData]);
  const errorRows = useMemo(() => parsedData.filter(r => r.errors.length > 0), [parsedData]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        if (jsonData.length === 0) {
          toast.error('The Excel file is empty');
          return;
        }

        // Get actual headers from the sheet to check for missing columns
        const headers: string[] = [];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = sheet[XLSX.utils.encode_cell({ c: C, r: range.s.r })];
          if (cell && cell.v) headers.push(String(cell.v));
        }

        const normalizedHeaders = headers.map(normalizeColumnName);
        const missingColumns = MANDATORY_COLUMNS.filter(col => !normalizedHeaders.includes(col));

        if (missingColumns.length > 0) {
          toast.error(`Missing mandatory columns: ${missingColumns.join(', ')}`);
          return;
        }

        // Normalize column names
        const normalizedData = jsonData.map((row) => {
          const normalized: Record<string, unknown> = {};
          // Only map known columns and ignore extra ones
          Object.entries(row).forEach(([key, value]) => {
            const normalizedKey = normalizeColumnName(key);
            normalized[normalizedKey] = value;
          });
          return normalized as unknown as ExcelRow;
        });

        const parsed = normalizedData.map((row, i) => validateRow(row, i));
        setParsedData(parsed);
        setStep('preview');
      } catch {
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleInsert = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows to insert');
      return;
    }

    setUploading(true);
    try {
      const result = await bulkInsertStudents(validRows.map(r => r.data));
      toast.success(`Successfully uploaded ${result.inserted} students`);
      
      if (result.duplicates.length > 0) {
        toast.info(`${result.duplicates.length} duplicate roll numbers were skipped`);
      }

      // Check if any rows included a placement status to mass-update
      const statusUpdates = validRows
        .filter(r => r.placement_status)
        .map(r => ({
          reg_number: r.data.reg_number,
          status: r.placement_status!,
          company_name: r.company_name,
        }));

      if (statusUpdates.length > 0) {
        const updateResult = await bulkUpdatePlacementStatus(statusUpdates);
        toast.success(`Updated placement status for ${updateResult.updated} students`);
        if (updateResult.failed.length > 0) {
          toast.error(`Failed to update status for ${updateResult.failed.length} students`);
        }
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process student rows');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName('');
    setStep('upload');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload Students via Excel
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload an Excel file (.xlsx) with student data
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
            <Alert>
              <AlertTitle>Expected Columns</AlertTitle>
              <AlertDescription>
                <strong>Mandatory:</strong> Name, Roll Number, Branch, Phone Number, Batch/Year<br />
                <strong>Optional:</strong> CGPA, Email, Section, Placement Status, Company<br />
                <span className="text-xs text-muted-foreground">Any extra columns will be ignored.</span>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                File: <span className="font-medium text-foreground">{fileName}</span>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-[hsl(var(--status-placed))]">
                  <CheckCircle className="h-4 w-4" /> {validRows.length} valid
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> {errorRows.length} errors
                  </span>
                )}
              </div>
            </div>

            {errorRows.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                    {errorRows.slice(0, 10).map((r, i) => (
                      <li key={i}>Row {r.row}: {r.errors.join(', ')}</li>
                    ))}
                    {errorRows.length > 10 && <li>...and {errorRows.length - 10} more</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>CGPA</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Status Col</TableHead>
                    <TableHead>Errors/Valid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 50).map((r, i) => (
                    <TableRow key={i} className={r.errors.length > 0 ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-xs">{r.row}</TableCell>
                      <TableCell>{r.data.name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.data.reg_number}</TableCell>
                      <TableCell>{r.data.branch}</TableCell>
                      <TableCell>{r.data.cgpa}</TableCell>
                      <TableCell className="text-xs">{r.data.email}</TableCell>
                      <TableCell>{r.data.batch_year}</TableCell>
                      <TableCell className="text-xs">
                        {r.placement_status ? (
                          <span className="flex flex-col">
                            <span>{STATUS_LABELS[r.placement_status]}</span>
                            {r.company_name && <span className="text-muted-foreground">{r.company_name}</span>}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {r.errors.length > 0 ? (
                          <span className="text-destructive text-xs">{r.errors[0]}</span>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--status-placed))]" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 50 && (
              <p className="text-xs text-muted-foreground">Showing first 50 rows of {parsedData.length}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Upload Different File
              </Button>
              <Button onClick={handleInsert} disabled={validRows.length === 0 || uploading}>
                {uploading ? 'Uploading...' : `Insert ${validRows.length} Students`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
