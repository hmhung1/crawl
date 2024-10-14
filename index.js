const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function uploadToCatbox(filePath) {
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', fs.createReadStream(filePath));

    const { data } = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: formData.getHeaders(),
    });

    return data; 
  } catch (error) {
    console.error('Error uploading to Catbox:', error.response?.data || error.message);
    throw new Error('Error uploading to Catbox');
  }
}

async function getTikTokVideo(url) {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://tikwm.com/api/',
      data: { url },
      headers: {
        'content-type': 'application/json',
      },
      timeout: 30000,
    });

    return response.data.data.play;
  } catch (error) {
    console.error('Error fetching TikTok video:', error.response?.data || error.message);
    throw new Error('Error fetching TikTok video');
  }
}

async function processTikTokLinks() {
  try {
    const links = fs.readFileSync('link.txt', 'utf-8').split('\n').filter(Boolean);
    let result = [];

    for (const link of links) {
      console.log(`Processing: ${link}`);

      const videoUrl = await getTikTokVideo(link);
      console.log(`Fetched TikTok video: ${videoUrl}`);

      const filePath = path.join(__dirname, 'cache', `${Date.now()}.mp4`);
      const writer = fs.createWriteStream(filePath);

      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
        timeout: 30000, 
      });
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const catboxLink = await uploadToCatbox(filePath);
      console.log(`Uploaded to Catbox: ${catboxLink}`);

      result.push(catboxLink);

      fs.unlinkSync(filePath);
    }

    fs.writeFileSync('result.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log('All videos processed and saved to result.json');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

processTikTokLinks();
