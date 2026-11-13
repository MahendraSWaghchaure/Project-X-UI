export interface Country {
  id: number;
  name: string;
  code: string | null;
}

export interface State {
  id: number;
  countryId: number;
  name: string;
  code: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Region {
  id: number;
  stateId: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  /** The district's own representative coordinates (B3); falls back to the parent state's when null. */
  latitude: number | null;
  longitude: number | null;
  stateId: number;
  stateName: string;
  stateLatitude: number | null;
  stateLongitude: number | null;
  regionId: number | null;
  regionName: string | null;
  countryId: number;
  countryName: string;
}
