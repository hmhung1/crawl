const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Hàm tải video lên Catbox
async function uploadToCatbox(filePath) {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', fs.createReadStream(filePath));

  const { data } = await axios.post('https://catbox.moe/user/api.php', formData, {
    headers: formData.getHeaders(),
  });

  return data; // Trả về link sau khi upload
}

// Hàm lấy video TikTok từ API Tikwm
async function getTikTokVideo(url) {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://tikwm.com/api/',
      data: { url },
      headers: {
        'content-type': 'application/json',
      },
    });

    // Trả về video URL từ kết quả API
    return response.data.data.play;
  } catch (error) {
    throw new Error('Error fetching TikTok video:', error);
  }
}

// Hàm chính xử lý toàn bộ quá trình
async function processTikTokLinks() {
  try {
    // Đọc tất cả các dòng trong file link.txt
    const links = fs.readFileSync('link.txt', 'utf-8').split('\n').filter(Boolean);
    let result = [];

    for (const link of links) {
      console.log(`Processing: ${link}`);

      // Lấy URL video từ TikTok
      const videoUrl = await getTikTokVideo(link);
      console.log(`Fetched TikTok video: ${videoUrl}`);

      // Tạo file tạm để lưu video
      const filePath = path.join(__dirname, 'cache', `${Date.now()}.mp4`);
      const writer = fs.createWriteStream(filePath);

      // Tải video về
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
      });
      response.data.pipe(writer);

      // Đợi cho việc tải xuống hoàn tất
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Upload video lên Catbox
      const catboxLink = await uploadToCatbox(filePath);
      console.log(`Uploaded to Catbox: ${catboxLink}`);

      // Lưu kết quả vào mảng
      result.push({ tiktok: link, catbox: catboxLink });

      // Xóa file tạm
      fs.unlinkSync(filePath);
    }

    // Lưu kết quả vào file JSON
    fs.writeFileSync('result.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log('All videos processed and saved to result.json');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Chạy hàm chính
processTikTokLinks();
