import axios from 'axios';
import fs from 'fs';

async function test() {
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
  let pageToken = undefined;
  let allPlaces = [];

  for (let i=0; i<3; i++) {
    const data = {
      textQuery: `Gram Panchayat in Jaipur Rajasthan`,
      pageSize: 20
    };
    if (pageToken) data.pageToken = pageToken;

    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      data,
      {
        headers: { 
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,nextPageToken'
        }
      }
    );

    allPlaces = allPlaces.concat(response.data.places);
    console.log(`Fetched ${response.data.places?.length} places`);
    pageToken = response.data.nextPageToken;
    if (!pageToken) break;
  }
  console.log(allPlaces.length);
}

test();
