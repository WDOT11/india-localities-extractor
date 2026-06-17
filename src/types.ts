export interface District {
  id: number;
  district_code: string;
  district_name: string;
  state_code: string;
  state_name: string;
}

export interface Locality {
  id: number;
  district_id: number;
  locality_name: string;
  locality_type: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
}

export interface ExtractJob {
  jobId: string;
  status: string;
  progress: number;
  districtId?: number;
}
