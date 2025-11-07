// backend/seed.js
const mongoose = require('mongoose');
const Product = require('./models/product.model');
require('dotenv').config();

// --- 1. ADD YOUR NEW MODELS HERE ---
const productsToSeed = [
  // --- THIS MODEL WAS CAUSING CRASHES, SO WE ARE REMOVING IT ---
  // {
  //   name: "McLaren F1",
  //   description: "The original car model.",
  //   modelPath: "/model/scene.gltf"
  // },
  {
    name: "Nissan GTR", // This will be the new default model
    description: "A GTR from Poly Pizza.",
    modelPath: "/model/Nissan GTR.glb"
  },

  // --- Your new models ---
  {
    name: "Clownfish",
    description: "A 3D model of a clownfish.",
    modelPath: "/model/Clownfish.glb"
  },
  {
    name: "Pimelea Suaveolens",
    description: "A 3D model of a plant.",
    modelPath: "/model/Pimelea Suaveolens.glb"
  },
  {
    name: "Bulky Knight",
    description: "A 3D model of a knight.",
    modelPath: "/model/bulky_knight.glb"
  },
  {
    name: "Lonely Fisherman",
    description: "A 3D diorama model.",
    modelPath: "/model/the_lonely_fisherman_-diorama-.glb"
  },
  {
    name: "Astronaut",
    description: "A 3D model of an astronaut.",
    modelPath: "/model/Astronaut.glb"
  },
  {
    name: "Mech",
    description: "A 3D model of a mech.",
    modelPath: "/model/Mech.glb"
  },
  {
    name: "Mech 2", // <-- Name for the button
    description: "A 3D model of a second mech.",
    modelPath: "/model/Mech-2.glb" // <-- The new, renamed file
  },
  {
    name: "Tractor",
    description: "A 3D model of a tractor.",
    modelPath: "/model/Tractor.glb"
  },
  {
    name: "MS Gundam",
    description: "A 3D model of a Gundam.",
    modelPath: "/model/MS Gundam RX-78-2 with weapons.glb"
  }
];
// ---------------------------------------

const seedDB = async () => {
  try {
    // Connects to your MongoDB Atlas database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connection established for seeding! 🚀');

    // Deletes all old products
    await Product.deleteMany({});
    console.log('Old products deleted.');

    // Inserts your new list of products
    await Product.insertMany(productsToSeed);
    console.log(`New catalog of ${productsToSeed.length} products has been seeded!`);

    // Disconnects from the database
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');

  } catch (err) {
    console.error('Error seeding database:', err);
    await mongoose.connection.close();
  }
};

// Runs the function when you call 'node seed.js'
seedDB();