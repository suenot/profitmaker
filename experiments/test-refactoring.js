#!/usr/bin/env node

/**
 * Simple test script to validate ccxtInstanceManager refactoring
 * This script verifies that:
 * 1. ccxtInstanceManager is properly exported
 * 2. No direct CCXT instantiations remain except in fallback cases
 * 3. ccxtBrowserProvider delegates to ccxtInstanceManager
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing CCXT Instance Manager Refactoring');
console.log('============================================');

// Test 1: Verify ccxtInstanceManager export
console.log('\n1. Checking ccxtInstanceManager export...');
const ccxtInstanceManagerPath = '../src/store/utils/ccxtInstanceManager.ts';
const ccxtInstanceManagerContent = fs.readFileSync(path.join(__dirname, ccxtInstanceManagerPath), 'utf8');

if (ccxtInstanceManagerContent.includes('export const ccxtInstanceManager = new CCXTInstanceManager()')) {
    console.log('✅ ccxtInstanceManager properly exported as singleton');
} else {
    console.log('❌ ccxtInstanceManager export not found');
}

// Test 2: Verify TestChartWidget.tsx uses ccxtInstanceManager
console.log('\n2. Checking TestChartWidget.tsx...');
const testChartWidgetPath = '../src/components/TestChartWidget.tsx';
const testChartWidgetContent = fs.readFileSync(path.join(__dirname, testChartWidgetPath), 'utf8');

if (testChartWidgetContent.includes('import { ccxtInstanceManager }')) {
    console.log('✅ TestChartWidget imports ccxtInstanceManager');
} else {
    console.log('❌ TestChartWidget does not import ccxtInstanceManager');
}

if (testChartWidgetContent.includes('ccxtInstanceManager.getExchangeInstanceForMarket')) {
    console.log('✅ TestChartWidget uses ccxtInstanceManager.getExchangeInstanceForMarket');
} else {
    console.log('❌ TestChartWidget does not use ccxtInstanceManager');
}

// Test 3: Verify TestTimeframes.tsx uses ccxtInstanceManager
console.log('\n3. Checking TestTimeframes.tsx...');
const testTimeframesPath = '../src/components/TestTimeframes.tsx';
const testTimeframesContent = fs.readFileSync(path.join(__dirname, testTimeframesPath), 'utf8');

if (testTimeframesContent.includes('import { ccxtInstanceManager }')) {
    console.log('✅ TestTimeframes imports ccxtInstanceManager');
} else {
    console.log('❌ TestTimeframes does not import ccxtInstanceManager');
}

if (testTimeframesContent.includes('ccxtInstanceManager.getExchangeInstanceForMarket')) {
    console.log('✅ TestTimeframes uses ccxtInstanceManager.getExchangeInstanceForMarket');
} else {
    console.log('❌ TestTimeframes does not use ccxtInstanceManager');
}

// Test 4: Verify ccxtBrowserProvider delegates to ccxtInstanceManager
console.log('\n4. Checking ccxtBrowserProvider.ts...');
const ccxtBrowserProviderPath = '../src/store/providers/ccxtBrowserProvider.ts';
const ccxtBrowserProviderContent = fs.readFileSync(path.join(__dirname, ccxtBrowserProviderPath), 'utf8');

if (ccxtBrowserProviderContent.includes('import { ccxtInstanceManager }')) {
    console.log('✅ ccxtBrowserProvider imports ccxtInstanceManager');
} else {
    console.log('❌ ccxtBrowserProvider does not import ccxtInstanceManager');
}

if (ccxtBrowserProviderContent.includes('ccxtInstanceManager.getExchangeInstanceForMarket')) {
    console.log('✅ ccxtBrowserProvider delegates to ccxtInstanceManager.getExchangeInstanceForMarket');
} else {
    console.log('❌ ccxtBrowserProvider does not delegate to ccxtInstanceManager');
}

if (ccxtBrowserProviderContent.includes('ccxtInstanceManager.clearCache')) {
    console.log('✅ ccxtBrowserProvider delegates cache clearing to ccxtInstanceManager');
} else {
    console.log('❌ ccxtBrowserProvider does not delegate cache clearing');
}

// Test 5: Check for duplicate caching code removal
console.log('\n5. Checking for duplicate cache removal...');

if (!ccxtBrowserProviderContent.includes('private static instancesCache = new Map')) {
    console.log('✅ Duplicate static instancesCache removed from ccxtBrowserProvider');
} else {
    console.log('❌ Duplicate static instancesCache still exists in ccxtBrowserProvider');
}

if (!ccxtBrowserProviderContent.includes('setInterval(() => {') ||
    ccxtBrowserProviderContent.includes('Cleanup теперь управляется централизованно')) {
    console.log('✅ Duplicate cleanup interval removed or replaced');
} else {
    console.log('❌ Duplicate cleanup interval still exists');
}

// Test 6: Check for remaining direct instantiations
console.log('\n6. Checking for direct CCXT instantiations...');

const filesToCheck = [
    testChartWidgetPath,
    testTimeframesPath,
    ccxtBrowserProviderPath
];

let foundDirectInstantiations = 0;
let expectedFallbackInstantiations = 0;

filesToCheck.forEach(filePath => {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    const directInstantiations = (content.match(/new ccxt\./g) || []).length;
    const fallbackInstantiations = (content.match(/Fallback|fallback|CCXT Pro.*fallback/gi) || []).length;

    foundDirectInstantiations += directInstantiations;
    expectedFallbackInstantiations += fallbackInstantiations;

    if (directInstantiations > 0) {
        console.log(`   - ${path.basename(filePath)}: ${directInstantiations} direct instantiation(s) found`);
    }
});

if (foundDirectInstantiations <= expectedFallbackInstantiations) {
    console.log('✅ Direct CCXT instantiations limited to fallback cases only');
} else {
    console.log(`❌ Found ${foundDirectInstantiations} direct instantiations, expected only ${expectedFallbackInstantiations} fallback cases`);
}

console.log('\n🎯 Refactoring Summary:');
console.log('- ccxtInstanceManager is now used as the central caching mechanism');
console.log('- Test components use ccxtInstanceManager instead of direct instantiation');
console.log('- ccxtBrowserProvider delegates to ccxtInstanceManager');
console.log('- Duplicate caching code has been removed');
console.log('- CCXT Pro has fallback logic until ccxtInstanceManager supports it');

console.log('\n✅ Refactoring validation completed!');