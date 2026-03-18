import { Users, CheckCircle, XCircle, Briefcase, Plus, UserCheck, Download, UserX } from 'lucide-react';
import { STATUS_LABELS } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePlacementData } from '@/hooks/usePlacementData';

export default function Dashboard() {
  const navigate = useNavigate();
  const { students, placements, drives, loading } = usePlacementData();

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-primary' },
    { label: 'Placed', value: placements.filter(p => p.status === 'placed').length, icon: CheckCircle, color: 'text-[hsl(var(--status-placed))]' },
    { label: 'Unplaced', value: placements.filter(p => p.status === 'unplaced').length, icon: XCircle, color: 'text-muted-foreground' },
    { label: 'Not Interested', value: placements.filter(p => p.status === 'not_interested').length, icon: UserX, color: 'text-orange-500' },
    { label: 'Active Drives', value: drives.filter(d => d.is_active).length, icon: Briefcase, color: 'text-primary' },
  ];

  const recentPlacements = placements
    .filter(p => p.status === 'placed' && p.company_name)
    .slice(0, 5)
    .map(p => {
      const student = students.find(s => s.reg_number === p.reg_number);
      return { ...p, studentName: student?.name ?? p.reg_number };
    });

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Training & Placement Cell Overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-foreground">{s.value}</span>
              <s.icon className={`h-6 w-6 ${s.color}`} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/drives?create=true')} className="gap-2">
          <Plus className="h-4 w-4" /> Create Drive
        </Button>
        <Button variant="outline" onClick={() => navigate('/students')} className="gap-2">
          <UserCheck className="h-4 w-4" /> Mark Placement
        </Button>
        <Button variant="outline" onClick={() => navigate('/drives')} className="gap-2">
          <Download className="h-4 w-4" /> Export Lists
        </Button>
      </div>

      {/* Recent Placements & Active Drives */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Placements</h2>
          <div className="space-y-3">
            {recentPlacements.map(p => (
              <div key={p.reg_number} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.studentName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.reg_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{p.company_name}</p>
                  <p className="text-xs text-muted-foreground">{p.package_lpa ? `${p.package_lpa} LPA` : '—'}</p>
                </div>
              </div>
            ))}
            {recentPlacements.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No placements yet</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Active Drives</h2>
          <div className="space-y-3">
            {drives.filter(d => d.is_active).map(d => (
              <div key={d.drive_id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{d.company_name}</p>
                  <span className="text-xs text-muted-foreground">
                    Deadline: {new Date(d.registration_deadline).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Min CGPA: {d.eligibility_criteria.min_cgpa} · {d.eligibility_criteria.allowed_branches.join(', ')}
                </p>
              </div>
            ))}
            {drives.filter(d => d.is_active).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active drives</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
