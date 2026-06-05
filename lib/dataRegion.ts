export type DataRegion = 'cz' | 'rs';

export const DEFAULT_DATA_REGION: DataRegion = 'cz';

export const DATA_REGION_LABELS: Record<DataRegion, string> = {
  cz: 'Czech Republic',
  rs: 'Serbia',
};

export const DATA_REGION_CENTERS: Record<DataRegion, { lat: number; lng: number; zoom: number }> = {
  cz: { lat: 50.08, lng: 14.42, zoom: 8 },
  rs: { lat: 44.82, lng: 20.46, zoom: 8 },
};

export function dataFileUrl(fileBaseName: string, dataRegion: DataRegion): string {
  return `/data/${fileBaseName}-${dataRegion}.json`;
}
