import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { usePlacementData } from '@/hooks/usePlacementData';

export default function AnalyticsPage() {
  const { students, placements, loading } = usePlacementData();

  const placed = placements.filter(p => p.status === 'placed');
  const notInterested = placements.filter(p => p.status === 'not_interested');
  const blacklisted = placements.filter(p => p.status === 'blacklisted');
  
  const total = students.length;
  const excluded = notInterested.length + blacklisted.length;
  const activePool = total - excluded;
  const unplaced = activePool - placed.length;
  
  const placementRate = activePool > 0 ? ((placed.length / activePool) * 100).toFixed(1) : '0';

  const branches = [...new Set(students.map(s => s.branch))];
  const branchData = branches.map(b => {
    const branchStudents = students.filter(s => s.branch === b);
    const branchTotal = branchStudents.length;
    
    const branchNotInt = notInterested.filter(p => branchStudents.some(s => s.reg_number === p.reg_number)).length;
    const branchBlk = blacklisted.filter(p => branchStudents.some(s => s.reg_number === p.reg_number)).length;
    
    const branchActive = branchTotal - branchNotInt - branchBlk;
    const branchPlaced = placed.filter(p => branchStudents.some(s => s.reg_number === p.reg_number)).length;
    const branchUnplaced = branchActive - branchPlaced;
    const rate = branchActive > 0 ? (branchPlaced / branchActive) * 100 : 0;
    
    let color = 'hsl(0, 72%, 51%)'; // Red
    if (rate >= 70) color = 'hsl(142, 71%, 45%)'; // Green (>= 70%)
    else if (rate >= 40) color = 'hsl(38, 92%, 50%)'; // Amber (40-69%)
    
    return { 
      branch: b, 
      Total: branchTotal, 
      "Active Pool": branchActive, 
      Placed: branchPlaced, 
      Unplaced: branchUnplaced, 
      "Rate %": Number(rate.toFixed(1)),
      fill: color 
    };
  });

  const companyMap: Record<string, number> = {};
  placed.forEach(p => {
    if (p.company_name) companyMap[p.company_name] = (companyMap[p.company_name] || 0) + 1;
  });
  const companyData = Object.entries(companyMap).map(([name, count]) => ({ company: name, count }));

  const topPackages = [...placed].filter(p => p.package_lpa).sort((a, b) => (Number(b.package_lpa ?? 0)) - (Number(a.package_lpa ?? 0))).slice(0, 5).map(p => {
    const student = students.find(s => s.reg_number === p.reg_number);
    return { name: student?.name ?? p.reg_number, company: p.company_name, package: p.package_lpa };
  });

  const COLORS = ['hsl(220, 70%, 45%)', 'hsl(280, 70%, 50%)', 'hsl(210, 100%, 50%)', 'hsl(215, 16%, 47%)'];

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Placement Analytics</h1>
        <p className="text-sm text-muted-foreground">Batch 2025 Overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm text-center flex flex-col items-center justify-center relative">
          <div className="h-28 w-full absolute top-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Placed', value: placed.length },
                    { name: 'Unplaced', value: unplaced }
                  ]}
                  cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} dataKey="value"
                >
                  <Cell fill="hsl(142, 71%, 45%)" />
                  <Cell fill="hsl(215, 16%, 47%)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-24 pb-2 z-10 w-full bg-card/60">
            <p className="text-3xl font-bold text-primary">{placementRate}%</p>
            <p className="text-sm text-muted-foreground font-medium">Placement Rate</p>
            <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-[200px] mx-auto leading-tight">
              Based on {activePool} active students. {excluded} excluded.
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm text-center flex flex-col justify-center">
          <p className="text-3xl font-bold text-foreground">{placed.length}/{activePool}</p>
          <p className="text-sm text-muted-foreground">Students Placed (Active)</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm text-center">
          <p className="text-3xl font-bold text-foreground">{companyData.length}</p>
          <p className="text-sm text-muted-foreground">Recruiting Companies</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Placements by Branch</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={branchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="branch" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar yAxisId="left" dataKey="Total" fill={COLORS[0]} />
              <Bar yAxisId="left" dataKey="Active Pool" fill={COLORS[1]} />
              <Bar yAxisId="left" dataKey="Placed" fill={COLORS[2]} />
              <Bar yAxisId="left" dataKey="Unplaced" fill={COLORS[3]} />
              <Bar yAxisId="right" dataKey="Rate %" name="Rate %">
                {branchData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Company-wise Hiring</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={companyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="company" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(142, 71%, 45%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Packages */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Top Packages</h2>
        {topPackages.length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Student</th>
                  <th className="text-left py-2 px-3">Company</th>
                  <th className="text-left py-2 px-3">Package (LPA)</th>
                </tr>
              </thead>
              <tbody>
                {topPackages.map((p, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 font-medium">{p.name}</td>
                    <td className="py-2 px-3">{p.company}</td>
                    <td className="py-2 px-3 font-semibold text-primary">₹{p.package} LPA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No placement data yet</p>
        )}
      </div>
      {/* Excluded Students Side-by-Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Not Interested Students</h2>
          {notInterested.length > 0 ? (
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-3">Student</th>
                    <th className="text-left py-2 px-3">Branch</th>
                    <th className="text-left py-2 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {notInterested.map((p, i) => {
                    const student = students.find(s => s.reg_number === p.reg_number);
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{student?.name ?? p.reg_number}</td>
                        <td className="py-2 px-3">{student?.branch}</td>
                        <td className="py-2 px-3 text-muted-foreground">{p.change_reason || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No 'Not Interested' students</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Blacklisted Students</h2>
          {blacklisted.length > 0 ? (
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-3">Student</th>
                    <th className="text-left py-2 px-3">Branch</th>
                    <th className="text-left py-2 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {blacklisted.map((p, i) => {
                    const student = students.find(s => s.reg_number === p.reg_number);
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{student?.name ?? p.reg_number}</td>
                        <td className="py-2 px-3">{student?.branch}</td>
                        <td className="py-2 px-3 text-muted-foreground">{p.change_reason || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No blacklisted students</p>
          )}
        </div>
      </div>
    </div>
  );
}
