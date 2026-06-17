import _data from './data.json';

function formatStateCode(stateName: string): string {
  if (stateName === 'Andaman and Nicobar Islands') return 'AN';
  if (stateName === 'Andhra Pradesh') return 'AP';
  if (stateName === 'Arunachal Pradesh') return 'AR';
  if (stateName === 'Assam') return 'AS';
  if (stateName === 'Bihar') return 'BR';
  if (stateName === 'Chandigarh') return 'CH';
  if (stateName === 'Chhattisgarh') return 'CG';
  if (stateName === 'Dadra and Nagar Haveli and Daman and Diu') return 'DD';
  if (stateName === 'Delhi') return 'DL';
  if (stateName === 'Goa') return 'GA';
  if (stateName === 'Gujarat') return 'GJ';
  if (stateName === 'Haryana') return 'HR';
  if (stateName === 'Himachal Pradesh') return 'HP';
  if (stateName === 'Jammu and Kashmir') return 'JK';
  if (stateName === 'Jharkhand') return 'JH';
  if (stateName === 'Karnataka') return 'KA';
  if (stateName === 'Kerala') return 'KL';
  if (stateName === 'Ladakh') return 'LA';
  if (stateName === 'Lakshadweep') return 'LD';
  if (stateName === 'Madhya Pradesh') return 'MP';
  if (stateName === 'Maharashtra') return 'MH';
  if (stateName === 'Manipur') return 'MN';
  if (stateName === 'Meghalaya') return 'ML';
  if (stateName === 'Mizoram') return 'MZ';
  if (stateName === 'Nagaland') return 'NL';
  if (stateName === 'Odisha') return 'OD';
  if (stateName === 'Puducherry') return 'PY';
  if (stateName === 'Punjab') return 'PB';
  if (stateName === 'Rajasthan') return 'RJ';
  if (stateName === 'Sikkim') return 'SK';
  if (stateName === 'Tamil Nadu') return 'TN';
  if (stateName === 'Telangana') return 'TS';
  if (stateName === 'Tripura') return 'TR';
  if (stateName === 'Uttar Pradesh') return 'UP';
  if (stateName === 'Uttarakhand') return 'UK';
  if (stateName === 'West Bengal') return 'WB';
  return stateName.substring(0, 2).toUpperCase();
}

export const INDIAN_STATES_AND_DISTRICTS = _data.map((stateRef: any, stateIdx: number) => {
  return {
    state_name: stateRef.name,
    state_code: formatStateCode(stateRef.name),
    districts: stateRef.districts.map((dName: string, dIdx: number) => ({
       district_name: dName,
       // creating artificial codes to avoid breaking compatibility
       district_code: `${stateIdx + 1}${String(dIdx + 1).padStart(2, '0')}`
    }))
  };
});

