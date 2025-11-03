// backend/download-models.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- 1. PASTE YOUR API KEY HERE ---
// Get this from the Poly Pizza "Settings" page
const API_KEY = 'e630739e467a49ffa414778d563ae3d8'; // e.g., 'pza_...'
// ---------------------------------

// --- 2. CUSTOMIZE YOUR SEARCHES ---
// Add any search terms you want here
const searchTerms = ['car', 'furniture', 'animal', 'planet', 'food', 'building', 'tree'];
// ---------------------------------

// --- 3. CONFIGURE SCRIPT ---
const API_URL = 'https://api.poly.pizza/v1.1/search';
const MODELS_PER_TERM = 8; // Max is 32. Let's get 8 of each.
const DOWNLOAD_DIR = path.join(__dirname, '../Ar-Product-Viewer/public/model');
// ---------------------------------

// Helper function to sanitize filenames (This is the corrected version)
const sanitizeFilename = (name) => {
  if (!name) {
    return `model_${Date.now()}.glb`; // Fallback for models with no name
  }
  
  // 1. Convert to lowercase
  let filename = name.toLowerCase();
  
  // 2. Replace spaces with underscores
  filename = filename.replace(/\s+/g, '_');
  
  // 3. Remove all characters that are not letters, numbers, or underscores
  filename = filename.replace(/[^a-z0-9_]/gi, '');
  
  // 4. Add the .glb extension
  return filename + '.glb';
};

// Helper function to download a single file
const downloadFile = async (url, savePath) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(savePath, response.data);
    console.log(`Successfully downloaded: ${savePath}`);
  } catch (err) {
    console.error(`Failed to download ${url}: ${err.message}`);
  }
};

// Main function
const runDownloader = async () => {
  console.log('Starting model download script...');
  
  if (API_KEY === 'PASTE_YOUR_KEY_HERE') {
    console.error('Error: Please paste your API key into the API_KEY variable.');
    return;
  }
  
  // Create the download directory if it doesn't exist
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const allModelsForSeeding = [];

  for (const term of searchTerms) {
    console.log(`--- Searching for: "${term}" ---`);
    try {
      const response = await axios.get(API_URL, {
        headers: { 'x-auth-token': API_KEY },
        params: {
          q: term,
          limit: MODELS_PER_TERM,
          Animated: false
        }
      });

      const models = response.data.results;

      for (const model of models) {
        if (model.Download) {
          const originalTitle = model.Title;
          const filename = sanitizeFilename(originalTitle);
          const savePath = path.join(DOWNLOAD_DIR, filename);
          
          // Download the file
          await downloadFile(model.Download, savePath);

          // Prepare the data for our seed.js file
          allModelsForSeeding.push({
            name: originalTitle,
            description: model.Category || 'A 3D model.',
            modelPath: `/model/${filename}` // The path our React app uses
          });
        }
      }
    } catch (err) {
      console.error(`Error searching for "${term}": ${err.message}`);
    }
  }

  console.log('\n--- DOWNLOADS COMPLETE ---');
  console.log('--- Copy the following array into your seed.js file: ---');
  
  // This will print a perfect, copy-and-paste-ready array for seed.js
  console.log(JSON.stringify(allModelsForSeeding, null, 2));
};

// Run the script
runDownloader();