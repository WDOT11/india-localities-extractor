import fs from 'fs';

async function fetchDistricts() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/sabuhish/indian-states-and-circuits/master/states.json');
    if (res.ok) {
       console.log('Got it');
    }
  } catch (e) {
  }
}
fetchDistricts();
