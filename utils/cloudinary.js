const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const compressAndUploadImage = async (url) => {
  const tempFilePath = path.join(__dirname, 'temp.jpg');
  
  try {
    // Download the image
    const response = await axios({
      url,
      responseType: 'arraybuffer',
    });

    // Compress the image by 50% using sharp
    await sharp(response.data)
      .jpeg({ quality: 50 })
      .toFile(tempFilePath);

    // Upload the compressed image to Cloudinary
    const result = await cloudinary.uploader.upload(tempFilePath);

    // Clean up the local file
    fs.unlink(tempFilePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error compressing and uploading image:', error);
    
    // Attempt to clean up temp file in case of error
    fs.unlink(tempFilePath, (err) => {
      if (err) console.error('Error deleting temp file after error:', err);
    });

    throw error;
  }
};

module.exports = { compressAndUploadImage };
