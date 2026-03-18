import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchStudents, fetchPlacements, fetchDrives, fetchApplications } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Centralized data hook — ensures all pages share the same cached data.
 * Any mutation that calls invalidateAll() will refresh data across every page.
 */
export function usePlacementData() {
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({
    queryKey: queryKeys.students,
    queryFn: fetchStudents,
    staleTime: 30_000,
  });

  const placementsQuery = useQuery({
    queryKey: queryKeys.placements,
    queryFn: fetchPlacements,
    staleTime: 30_000,
  });

  const drivesQuery = useQuery({
    queryKey: queryKeys.drives,
    queryFn: fetchDrives,
    staleTime: 30_000,
  });

  const applicationsQuery = useQuery({
    queryKey: queryKeys.applications,
    queryFn: fetchApplications,
    staleTime: 30_000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.students });
    queryClient.invalidateQueries({ queryKey: queryKeys.placements });
    queryClient.invalidateQueries({ queryKey: queryKeys.drives });
    queryClient.invalidateQueries({ queryKey: queryKeys.applications });
  };

  return {
    students: studentsQuery.data ?? [],
    placements: placementsQuery.data ?? [],
    drives: drivesQuery.data ?? [],
    applications: applicationsQuery.data ?? [],
    loading: studentsQuery.isLoading || placementsQuery.isLoading || drivesQuery.isLoading || applicationsQuery.isLoading,
    invalidateAll,
    queryClient,
  };
}
