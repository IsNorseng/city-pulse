import type {CityKey} from './pulse-data';
import dataset from '../data/verified-observations.json';

export type Observation = {
  cityKey: CityKey; city: string; id: string; label: string;
  value: number; unit: string; period: string; periodKey: string;
  geo: string; geoLevel: 'city'|'federal_subject'|'region_proxy';
  source: string; url: string; published: string; dateChecked: string;
  change: number|null; changeUnit: string; quality: 'A'|'B'|'C'|'D';
  scope: string; frequency: string; evidenceId: string; locator: string;
  verification: 'direct_primary'; aggregation: 'mean';
  priceBasis: 'offer'|'unspecified'; sampleSize: null;
};

const rows = dataset.observations as Observation[];
export const observations: Record<CityKey,Observation[]> = {
  spb: rows.filter(row => row.cityKey === 'spb'),
  krd: rows.filter(row => row.cityKey === 'krd'),
};
export function observation(city: CityKey, id: string) {
  return observations[city].find(row => row.id === id);
}
export const checkedAt = dataset.checkedAt;
