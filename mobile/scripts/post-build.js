#!/usr/bin/env node

/**
 * Post-build script to generate build artifacts and metadata
 */

const fs = require('fs');
const path = require('path');

console.log('📦 Running post-build tasks...\n');

// Get build information from environment
const buildProfile = process.env.EAS_BUILD_PROFILE || 'unknown';
const buildPlatform = process.env.EAS_BUILD_PLATFORM || 'all';
const buildNumber = process.env.EAS_BUILD_NUMBER || 'local';

console.log(`Build Profile: ${buildProfile}`);
console.log(`Build Platform: ${buildPlatform}`);
console.log(`Build Number: ${buildNumber}\n`);

// Create build metadata file
const metadata = {
  buildNumber,
  buildProfile,
  buildPlatform,
  timestamp: new Date().toISOString(),
  version: require('../package.json').version,
  gitCommit: process.env.EAS_BUILD_GIT_COMMIT_HASH || 'unknown',
};

const metadataPath = path.join(__dirname, '..', 'build-metadata.json');
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('✅ Build metadata saved to build-metadata.json');

// Generate changelog or release notes if needed
console.log('✅ Post-build tasks completed\n');
