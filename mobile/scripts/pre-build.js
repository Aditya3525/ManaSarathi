#!/usr/bin/env node

/**
 * Pre-build script to validate configuration and prepare for build
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

console.log('🔍 Running pre-build checks...\n');

// Check 1: Verify environment variables
console.log('✓ Checking environment configuration...');
const envExample = path.join(__dirname, '.env.example');
const envFile = path.join(__dirname, '.env');

if (!fs.existsSync(envFile)) {
  warnings.push('⚠️  .env file not found. Using default configuration.');
}

// Check 2: Verify app.json configuration
console.log('✓ Checking app.json configuration...');
const appJsonPath = path.join(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  if (!appJson.expo.ios.bundleIdentifier) {
    errors.push('❌ iOS bundle identifier not set in app.json');
  }
  
  if (!appJson.expo.android.package) {
    errors.push('❌ Android package name not set in app.json');
  }
  
  if (appJson.expo.extra?.eas?.projectId === 'your-project-id-here') {
    warnings.push('⚠️  EAS project ID not configured in app.json');
  }
} else {
  errors.push('❌ app.json not found');
}

// Check 3: Verify eas.json configuration
console.log('✓ Checking eas.json configuration...');
const easJsonPath = path.join(__dirname, 'eas.json');
if (fs.existsSync(easJsonPath)) {
  const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  
  if (!easJson.build) {
    errors.push('❌ Build configuration missing in eas.json');
  }
} else {
  errors.push('❌ eas.json not found');
}

// Check 4: Verify TypeScript compilation
console.log('✓ Checking TypeScript configuration...');
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
if (!fs.existsSync(tsconfigPath)) {
  errors.push('❌ tsconfig.json not found');
}

// Check 5: Verify required assets
console.log('✓ Checking required assets...');
const requiredAssets = [
  'assets/images/icon.png',
  'assets/images/splash.png',
  'assets/images/adaptive-icon.png',
];

requiredAssets.forEach(asset => {
  const assetPath = path.join(__dirname, asset);
  if (!fs.existsSync(assetPath)) {
    warnings.push(`⚠️  Missing asset: ${asset}`);
  }
});

// Check 6: Verify dependencies
console.log('✓ Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDeps = [
    'expo',
    'expo-router',
    'react',
    'react-native',
    '@tanstack/react-query',
  ];
  
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies[dep]) {
      errors.push(`❌ Required dependency missing: ${dep}`);
    }
  });
}

// Print results
console.log('\n' + '='.repeat(50));
console.log('Pre-build Check Results:');
console.log('='.repeat(50) + '\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Ready to build.\n');
  process.exit(0);
}

if (warnings.length > 0) {
  console.log('⚠️  Warnings:\n');
  warnings.forEach(warning => console.log(`  ${warning}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ Errors:\n');
  errors.forEach(error => console.log(`  ${error}`));
  console.log('\n❌ Please fix the errors before building.\n');
  process.exit(1);
}

console.log('✅ Checks passed with warnings. You may proceed.\n');
process.exit(0);
