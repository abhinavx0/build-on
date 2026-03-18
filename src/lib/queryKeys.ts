// Centralized React Query keys for cross-page data synchronization
export const queryKeys = {
  students: ['students'] as const,
  placements: ['placements'] as const,
  drives: ['drives'] as const,
  applications: ['applications'] as const,
  all: ['students', 'placements', 'drives', 'applications'] as const,
};
