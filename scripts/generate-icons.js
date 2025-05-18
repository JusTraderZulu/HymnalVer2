const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if ImageMagick is installed
try {
  execSync('which convert', { stdio: 'ignore' });
} catch (error) {
  console.error('Error: ImageMagick is required for this script.');
  console.error('Please install it with: brew install imagemagick');
  process.exit(1);
}

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICON_TEMPLATE = path.join(__dirname, '../public/icons/icon-template.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate icons for each size
ICON_SIZES.forEach(size => {
  const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
  const command = `convert -background none -resize ${size}x${size} ${ICON_TEMPLATE} ${outputPath}`;
  
  try {
    console.log(`Generating ${size}x${size} icon...`);
    execSync(command);
  } catch (error) {
    console.error(`Error generating ${size}x${size} icon:`, error.message);
  }
});

console.log('Icon generation complete!'); 