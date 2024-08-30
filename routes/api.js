const express = require('express');
const multer = require('multer');
// const parse = require('csv-parse');
const fs = require('fs');
const Product = require('../models/Product');
const { compressAndUploadImage } = require('../utils/cloudinary');
const { Parser } = require('json2csv');
const path = require('path');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const parse = require('csv-parse').parse;
router.post('/upload', upload.single('file'), async (req, res) => {
  console.log(parse); 
  console.log("44444",req.file)
  const file = req.file;
  const products = [];


  var csvData=[];
  fs.createReadStream(file.path)
    .pipe(parse({ delimiter: ',', from_line: 2 }))
    .on('data', (row) => {
      const [serialNumber, productName, inputImageUrls] = row;
      const inputImages = inputImageUrls.split(',').map(url => url.trim());
      products.push({ serialNumber, productName, inputImageUrls: inputImages });
    })
    .on('end', async () => {
      try {
        const insertedProducts = await Product.insertMany(products);
        fs.unlinkSync(file.path); // Delete the uploaded CSV file
        res.json({ requestId: insertedProducts[0]._id });
      } catch (error) {
        console.error('Error saving products to the database:', error);
        res.status(500).json({ error: 'Error saving products to the database' });
      }
    })
    .on('error', (err) => {
      console.error('Error processing CSV file:', err);
      res.status(500).json({ error: 'Error processing CSV file' });
    });
});

router.get('/status/:requestId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.requestId);
    if (!product) return res.status(404).json({ error: 'Request ID not found' });
    res.json({ status: product.status });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching status' });
  }
});

router.post('/process/:requestId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.requestId);
    if (!product) return res.status(404).json({ error: 'Request ID not found' });

    // Process images and get output URLs
    const outputImageUrls = await Promise.all(
      product.inputImageUrls.map(url => compressAndUploadImage(url))
    );

    // Update product with output URLs and mark as completed
    product.outputImageUrls = outputImageUrls;
    product.status = 'Completed';
    await product.save();

    // Prepare CSV data
    const csvData = product.inputImageUrls.map((url, index) => ({
      'Serial Number': product.serialNumber,
      'Product Name': product.productName,
      'Input Image Urls': url,
      'Output Image Urls': outputImageUrls[index]
    }));

    const parser = new Parser();
    const csv = parser.parse(csvData);

    // Create a temporary file path for the CSV
    const tempFilePath = path.join(__dirname, 'temp.csv');
    fs.writeFileSync(tempFilePath, csv);

    // Send the CSV file as response
    res.download(tempFilePath, 'processed_images.csv', (err) => {
      if (err) {
        console.error('Error sending CSV file:', err);
        res.status(500).json({ error: 'Error sending CSV file' });
      }

      // Clean up the temporary file
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error processing images' });
  }
});

module.exports = router;
