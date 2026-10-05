import type {CityKey} from './pulse-data';
import dataset from '../data/verified-averages.json';

export type AverageMetricId = 'salary'|'income'|'consumerExpenses'|'foodMinimum';
export type AverageObservation = {
  cityKey: CityKey;
  id: AverageMetricId;
  label: string;
  value: number;
  decimals: number;
  unit: string;
  period: string;
  geo: string;
  geoLevel: 'city'|'federal_subject';
  scope: string;
  description: string;
  url: string;
  source: string;
  published: string|null;
  dateChecked: string;
  locator: string;
  change: number|null;
  changeLabel: string|null;
  basis: 'gross'|'per_capita'|'standard_basket'|'unspecified';
  verification: 'direct_primary';
  aggregation: 'mean'|'standard_cost';
  evidenceId: string;
};

const rows = dataset.observations as AverageObservation[];
export const averageObservations: Record<CityKey,AverageObservation[]> = {
  spb: rows.filter(row=>row.cityKey==='spb'),
  krd: rows.filter(row=>row.cityKey==='krd'),
};
export function averageObservation(city:CityKey,id:AverageMetricId) {
  return averageObservations[city].find(row=>row.id===id);
}
