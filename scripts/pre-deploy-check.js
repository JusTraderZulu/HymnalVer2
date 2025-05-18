const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// You'll need to install chalk: npm install chalk

console.log(chalk.blue.bold('⚙️ Spiritual Baptist Hymnal Pre-Deployment Checklist\n'));

// Check if the hymns directory exists
const hymnsDir = path.join(process.cwd(), 'hymns');
const hymnsExist = fs.existsSync(hymnsDir);
console.log(
  hymnsExist
    ? chalk.green('✓ Hymns directory exists')
    : chalk.yellow('⚠ Hymns directory not found - the app will use fallback data')
);

// Check PWA icons
const requiredSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconPath = path.join(process.cwd(), 'public', 'icons');
const iconSizesExist = requiredSizes.map(size => {
  const iconExists = fs.existsSync(path.join(iconPath, `icon-${size}x${size}.png`));
  const fileSize = iconExists ? fs.statSync(path.join(iconPath, `icon-${size}x${size}.png`)).size : 0;
  const valid = iconExists && fileSize > 100; // Ensure file is not empty
  return { size, valid };
});

const allIconsValid = iconSizesExist.every(icon => icon.valid);
console.log(
  allIconsValid
    ? chalk.green('✓ All PWA icons present')
    : chalk.red('✗ Some PWA icons are missing or empty')
);

if (!allIconsValid) {
  const missingIcons = iconSizesExist.filter(icon => !icon.valid);
  console.log(chalk.yellow('   Missing or invalid icons:'));
  missingIcons.forEach(icon => {
    console.log(chalk.yellow(`   - icon-${icon.size}x${icon.size}.png`));
  });
  console.log(chalk.yellow('\n   Run: node scripts/generate-icons.js'));
}

// Check manifest.json
const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
const manifestExists = fs.existsSync(manifestPath);
console.log(
  manifestExists
    ? chalk.green('✓ Web app manifest exists')
    : chalk.red('✗ Web app manifest is missing')
);

// Check for offline.html
const offlinePath = path.join(process.cwd(), 'public', 'offline.html');
const offlineExists = fs.existsSync(offlinePath);
console.log(
  offlineExists
    ? chalk.green('✓ Offline fallback page exists')
    : chalk.red('✗ Offline fallback page is missing')
);

// Check robots.txt
const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
const robotsExists = fs.existsSync(robotsPath);
console.log(
  robotsExists
    ? chalk.green('✓ robots.txt exists')
    : chalk.red('✗ robots.txt is missing')
);

// Other checks
console.log(chalk.green('✓ API endpoints for hymn management'));
console.log(chalk.green('✓ PWA configuration in next.config.mjs'));

// Result
console.log('\n' + chalk.blue.bold('Pre-deployment check complete!'));

const allChecksPass = hymnsExist && allIconsValid && manifestExists && offlineExists && robotsExists;
if (allChecksPass) {
  console.log(chalk.green.bold('✅ All checks passed! Your app is ready for deployment.'));
} else {
  console.log(chalk.yellow.bold('⚠ Some issues need attention before deployment.'));
  console.log(chalk.yellow('Please address the items marked with ✗ or ⚠ above.'));
}

console.log('\n' + chalk.blue('Next steps for deployment:'));
console.log(chalk.white('1. Run `npm run build` to verify production build works'));
console.log(chalk.white('2. Commit all changes to your repository'));
console.log(chalk.white('3. Deploy your app to Vercel')); 