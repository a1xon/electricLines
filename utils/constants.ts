export const VOLTAGE_CONFIG: Record<string, string> = { 
  '3.3': '#f1c40f', 
  '5': '#3498db', 
  '12': '#2ecc71', 
  '24': '#9b59b6' 
};

export const AVAILABLE_VOLTAGES = [3.3, 5, 12, 24];

export const GRID_CELL = 25;

export const LEVELS = ['A', 'B', 'C', 'D', 'E'];

export const getVoltageColor = (v: number | string) => VOLTAGE_CONFIG[v.toString()] || '#999';

export const getLevelDesc = (l: string) => {
  const map: Record<string, string> = {
    'A': 'Base (Sources)',
    'B': 'Level 2',
    'C': 'Level 3',
    'D': 'Level 4',
    'E': 'Top Level'
  };
  return map[l] || `Level ${l}`;
};

export const getRiserType = (l: string, totalLevels: number, index: number) => {
  if (index === 0) return 'UP';
  if (index === totalLevels - 1) return 'DN';
  return 'UP/DN';
};
