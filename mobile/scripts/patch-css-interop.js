/**
 * Patches react-native-css-interop's render-component.js to prevent
 * errors from React Navigation's NavigationStateContext throwing getters
 * during JSON.stringify in printUpgradeWarning/stringify.
 *
 * Root cause: NavigationStateContext has a default value with a getter
 * that throws when accessed outside a NavigationContainer. The css-interop
 * stringify function iterates Object.entries() on component props during
 * rendering, hitting this getter and crashing the render cycle.
 *
 * This patch wraps the stringify loop and printUpgradeWarning in try-catch.
 * Run automatically via postinstall in package.json.
 */
const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-css-interop',
  'dist',
  'runtime',
  'native',
  'render-component.js'
);

if (!fs.existsSync(targetFile)) {
  console.log('[patch-css-interop] Target file not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Check if already patched
if (content.includes('[Unserializable]')) {
  console.log('[patch-css-interop] Already patched, skipping.');
  process.exit(0);
}

// Patch stringify's Object.entries loop with try-catch
const oldStringify = `for (const entry of Object.entries(value)) {
            newValue[entry[0]] = replace(entry[0], entry[1]);
        }`;

const newStringify = `try {
            for (const entry of Object.entries(value)) {
                try {
                    newValue[entry[0]] = replace(entry[0], entry[1]);
                } catch (_e) {
                    newValue[entry[0]] = "[Unserializable]";
                }
            }
        } catch (_e) {
            return "[Unserializable]";
        }`;

if (content.includes(oldStringify)) {
  content = content.replace(oldStringify, newStringify);
} else {
  console.log('[patch-css-interop] Could not find stringify pattern to patch.');
}

// Wrap printUpgradeWarning body in try-catch
const oldWarn = `function printUpgradeWarning(warning, originalProps) {
    console.log(\`CssInterop upgrade warning`;

const newWarn = `function printUpgradeWarning(warning, originalProps) {
    try { console.log(\`CssInterop upgrade warning`;

if (content.includes(oldWarn)) {
  content = content.replace(oldWarn, newWarn);

  // Close the try-catch after the console.log statement
  const closingPattern = `keeping-list-items-in-order-with-key\\n\`);
}`;
  const closingReplacement = `keeping-list-items-in-order-with-key\\n\`);
    } catch (_e) { /* swallow serialization errors */ }
}`;

  if (content.includes(closingPattern)) {
    content = content.replace(closingPattern, closingReplacement);
  }
} else {
  console.log('[patch-css-interop] Could not find printUpgradeWarning pattern to patch.');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('[patch-css-interop] Successfully patched react-native-css-interop.');
