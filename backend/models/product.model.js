// models/product.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  modelPath: { type: String, required: true }, // e.g., "/model/scene.gltf"
}, {
  timestamps: true,
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;