const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  serialNumber: Number,
  productName: String,
  inputImageUrls: [String],
  outputImageUrls: [String],
  status: { type: String, default: 'Pending' },
});

module.exports = mongoose.model('Product', ProductSchema);
