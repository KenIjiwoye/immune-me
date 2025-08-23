// Simple structure test using ES modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing facility performance metrics function structure...');

// Test file structure
const requiredFiles = [
  'package.json',
  'src/main.js',
  '.env.example',
  'README.md'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file} exists`);
  } else {
    console.log(`✗ ${file} missing`);
    allFilesExist = false;
  }
});

// Test package.json structure
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log('✓ package.json is valid JSON');
  
  const requiredFields = ['name', 'version', 'description', 'main', 'dependencies'];
  requiredFields.forEach(field => {
    if (packageJson[field]) {
      console.log(`✓ package.json has ${field}`);
    } else {
      console.log(`✗ package.json missing ${field}`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.error('✗ package.json error:', error.message);
  allFilesExist = false;
}

console.log('\nStructure test complete!');
console.log(allFilesExist ? '✓ All structure tests passed' : '✗ Some structure tests failed');