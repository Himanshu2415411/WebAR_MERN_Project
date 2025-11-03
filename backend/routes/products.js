// routes/products.js
const router = require('express').Router();
let Product = require('../models/product.model');

// GET all products
router.route('/').get((req, res) => {
  Product.find()
    .then(products => res.json(products))
    .catch(err => res.status(400).json('Error: ' + err));
});

// ADD a new product (we'll use this to add your car)
router.route('/add').post((req, res) => {
  const name = req.body.name;
  const description = req.body.description;
  const modelPath = req.body.modelPath;

  const newProduct = new Product({
    name,
    description,
    modelPath,
  });

  newProduct.save()
    .then(() => res.json('Product added!'))
    .catch(err => res.status(400).json('Error: ' + err));
});

module.exports = router;