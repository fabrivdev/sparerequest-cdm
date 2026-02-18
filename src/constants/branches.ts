// Branch names matching ERP (Datapar) names
export const BRANCHES = [
  'CENTRAL',
  'KATUETE',
  'CAMPO 9',
  'MISIONES',
  'LOMA PLATA',
  'SANTA ROSA DEL AGUARAY',
  'REGION SAN ALBERTO',
  'REGION ITAPUA',
] as const;

export type Branch = typeof BRANCHES[number];

// ERP branch code → branch name mapping (from Datapar system)
export const BRANCH_CODE_MAP: Record<number, string> = {
  1: 'CENTRAL',
  2: 'KATUETE',
  3: 'CAMPO 9',
  4: 'MISIONES',
  5: 'LOMA PLATA',
  // 6: 'REPLICABI', // Excluded from transfers
  7: 'SANTA ROSA DEL AGUARAY',
  8: 'REGION SAN ALBERTO',
  9: 'REGION ITAPUA',
};
