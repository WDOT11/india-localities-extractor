import axios from 'axios';

async function run() {
  const res = await axios.get('https://api.postalpincode.in/postoffice/Jaipur');
  console.log(res.data[0].PostOffice.length);
  console.log(res.data[0].PostOffice[0]);
}
run();
