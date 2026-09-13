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
}

export interface Region {
  id: number;
  stateId: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  stateId: number;
  stateName: string;
  regionId: number | null;
  regionName: string | null;
  countryId: number;
  countryName: string;
}
