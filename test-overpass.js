import axios from 'axios';

async function run() {
  const query = `
    [out:json][timeout:30];
    area["name"="Jaipur"]["admin_level"~"5|6"]->.searchArea;
    node["place"~"city|town|village|suburb|hamlet|locality"](area.searchArea);
    out center;
  `;
  try {
    const res = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 30000
    });
    console.log(res.data.elements.length);
  } catch(e) {
    console.error(e.message);
  }
}
run();
