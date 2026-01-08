export const BRANCHES = [
  'CAMPO 9',
  'ITAPUA',
  'KATUETE',
  'LOMA PLATA',
  'MISIONES',
  'SAN ALBERTO',
  'SANTA RITA',
  'SANTA ROSA',
] as const;

export type Branch = typeof BRANCHES[number];
