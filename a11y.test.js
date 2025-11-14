#!/usr/bin/env node
/* jshint esversion: 11 */
/* jshint -W079 */ // Allow redefinition of __filename and __dirname
/* jshint -W014 */ // Allow line breaks before ternary operators

/**
 * Standalone Accessibility Testing Script
 *
 * Tests any website for WCAG 2.0/2.1 Level A/AA compliance using axe-core.
 *
 * Usage:
 *   node a11y.test.js --url https://example.com
 *   node a11y.test.js --url https://example.com --password mypass
 *   node a11y.test.js --config test-config.json
 *
 * Options:
 *   --url           URL to test (required if no config file)
 *   --password      Password for password-protected sites
 *   --output        Output directory for reports (default: ./a11y-reports)
 *   --name          Test name for report files (default: derived from URL)
 *   --browser       Browser to use: chromium, firefox, webkit (default: chromium)
 *   --config        JSON config file with test scenarios
 *   --headless      Run in headless mode (default: true)
 *   --exclude       CSS selectors to exclude (comma-separated)
 *
 * Config file format (JSON):
 * {
 *   "baseUrl": "https://example.com",
 *   "password": "optional-password",
 *   "outputDir": "./reports",
 *   "scenarios": [
 *     {
 *       "name": "Homepage",
 *       "path": "/",
 *       "actions": [] // Optional: array of actions to perform
 *     },
 *     {
 *       "name": "About Page",
 *       "path": "/about"
 *     }
 *   ]
 * }
 */

import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url: null,
    password: null,
    outputDir: './a11y-reports',
    name: null,
    browser: 'chromium',
    configFile: null,
    headless: true,
    exclude: [],
    failOn: 'serious', // 'critical', 'serious', 'moderate', 'minor', 'all'
    treatIncompleteAsViolations: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        config.url = args[++i];
        break;
      case '--password':
        config.password = args[++i];
        break;
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--name':
        config.name = args[++i];
        break;
      case '--browser':
        config.browser = args[++i];
        break;
      case '--config':
        config.configFile = args[++i];
        break;
      case '--headless':
        config.headless = args[++i] !== 'false';
        break;
      case '--exclude':
        config.exclude = args[++i].split(',').map(s => s.trim());
        break;
      case '--fail-on':
        config.failOn = args[++i];
        break;
      case '--treat-incomplete-as-violations':
        config.treatIncompleteAsViolations = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

function printHelp() {
  console.log(`
Standalone Accessibility Testing Script

Usage:
  node standalone-a11y-test.js --url https://example.com
  node standalone-a11y-test.js --config test-config.json

Options:
  --url           URL to test (required if no config file)
  --password      Password for password-protected sites
  --output        Output directory for reports (default: ./a11y-reports)
  --name          Test name for report files (default: derived from URL)
  --browser       Browser to use: chromium, firefox, webkit (default: chromium)
  --config        JSON config file with test scenarios
  --headless      Run in headless mode (default: true)
  --exclude       CSS selectors to exclude (comma-separated)
  --fail-on       Severity level to fail on: critical, serious, moderate, minor, all (default: serious)
  --treat-incomplete-as-violations  Treat incomplete checks as violations (recommended)
  --help          Show this help message

Examples:
  # Test a single URL
  node standalone-a11y-test.js --url https://example.com

  # Test with password protection
  node standalone-a11y-test.js --url https://example.com --password mypass

  # Test multiple scenarios from config file
  node standalone-a11y-test.js --config test-config.json

  # Use Firefox in non-headless mode
  node standalone-a11y-test.js --url https://example.com --browser firefox --headless false

Config file format:
{
  "baseUrl": "https://example.com",
  "password": "optional-password",
  "outputDir": "./reports",
  "scenarios": [
    {
      "name": "Homepage",
      "path": "/"
    },
    {
      "name": "About Page",
      "path": "/about"
    }
  ]
}
  `);
}

// Handle password-protected sites
async function navigateWithPassword(page, url, password) {
  console.log('   🔐 Handling password protection...');

  await page.goto(url, {
    waitUntil: 'load',
    timeout: 60000
  });

  // Check if password form is present
  const passwordInput = await page.locator('input[type="password"]').first();
  const isPasswordProtected = await passwordInput.count() > 0;

  if (isPasswordProtected && password) {
    await passwordInput.fill(password);

    // Find and click submit button
    const submitButton = await page.locator('button[type="submit"], input[type="submit"]').first();
    await submitButton.click();

    // Wait for navigation
    await page.waitForLoadState('load');
    console.log('   ✅ Password authentication successful');
  } else if (isPasswordProtected && !password) {
    console.warn('   ⚠️  Site is password protected but no password provided');
  }
}

// Generate HTML report
function generateHTMLReport(results, pageName, url, testName) {
  const { violations, passes, incomplete, inapplicable } = results;

  const violationsSummary = violations
    .map(
      (violation) => `
    <div class="violation ${violation.impact}">
      <h3>${violation.id}: ${violation.help}</h3>
      <p><strong>Impact:</strong> ${violation.impact}</p>
      <p><strong>Description:</strong> ${violation.description}</p>
      <p><strong>Help:</strong> <a href="${violation.helpUrl}" target="_blank">${violation.helpUrl}</a></p>
      <p><strong>Nodes affected:</strong> ${violation.nodes.length}</p>
      <details>
        <summary>Show affected elements</summary>
        <ul>
          ${violation.nodes
            .map(
              (node) => {
                const allChecks = [
                  ...(node.any || []),
                  ...(node.all || []),
                  ...(node.none || [])
                ];

                const meaningfulChecks = allChecks.filter(check =>
                  (check.message && check.message.trim()) || (check.id && check.id.trim())
                );

                const checkMessages = meaningfulChecks.length > 0
                  ? `<ul>${meaningfulChecks.map((check) => `<li>${check.message || check.id}</li>`).join('')}</ul>`
                  : '';

                return `
            <li>
              <code>${node.html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
              ${checkMessages}
            </li>
          `;
              }
            )
            .join('')}
        </ul>
      </details>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report - ${pageName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
    }
    .summary-card .count {
      font-size: 32px;
      font-weight: bold;
    }
    .violations { color: #d32f2f; }
    .passes { color: #388e3c; }
    .incomplete { color: #f57c00; }
    .inapplicable { color: #757575; }
    .violation {
      background: white;
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 8px;
      border-left: 4px solid;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .violation.critical { border-left-color: #d32f2f; }
    .violation.serious { border-left-color: #f57c00; }
    .violation.moderate { border-left-color: #ffa726; }
    .violation.minor { border-left-color: #ffeb3b; }
    .violation h3 {
      margin-top: 0;
      color: #333;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 14px;
      display: inline-block;
      max-width: 100%;
      overflow-wrap: break-word;
    }
    details {
      margin-top: 10px;
    }
    summary {
      cursor: pointer;
      color: #1976d2;
      font-weight: 500;
    }
    summary:hover {
      text-decoration: underline;
    }
    ul {
      margin: 10px 0;
    }
    .no-violations {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌐 Accessibility Report</h1>
    <p><strong>Test:</strong> ${testName}</p>
    <p><strong>Page:</strong> ${pageName}</p>
    <p><strong>URL:</strong> <a href="${url}" target="_blank">${url}</a></p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Violations</h3>
      <div class="count violations">${violations.length}</div>
    </div>
    <div class="summary-card">
      <h3>Passes</h3>
      <div class="count passes">${passes.length}</div>
    </div>
    <div class="summary-card">
      <h3>Incomplete</h3>
      <div class="count incomplete">${incomplete.length}</div>
    </div>
    <div class="summary-card">
      <h3>Inapplicable</h3>
      <div class="count inapplicable">${inapplicable.length}</div>
    </div>
  </div>

  ${
    violations.length === 0
      ? '<div class="no-violations">✅ No accessibility violations found!</div>'
      : `<h2>Violations Found (${violations.length})</h2>${violationsSummary}`
  }
</body>
</html>
  `;
}

// Test a single URL
async function testUrl(browser, url, config, scenario = null) {
  // Create a new context (required by AxeBuilder)
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    const testName = scenario?.name || config.name || 'Accessibility Test';
    const fullUrl = scenario ? `${config.baseUrl || config.url}${scenario.path}` : url;

    console.log(`\n🔍 Testing: ${testName}`);
    console.log(`   URL: ${fullUrl}`);

    // Handle password protection if needed
    if (config.password) {
      await navigateWithPassword(page, fullUrl, config.password);
    } else {
      // Use 'load' instead of 'networkidle' to avoid timeouts on sites with continuous requests
      await page.goto(fullUrl, {
        waitUntil: 'load',
        timeout: 60000 // Increase timeout to 60 seconds
      });
    }

    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Additional wait to ensure dynamic content is loaded
    await page.waitForTimeout(2000);

    console.log(`   ⏳ Page loaded, waiting for dynamic content...`);

    // Try to dismiss common cookie banners and overlays
    console.log(`   🍪 Attempting to dismiss cookie banners and overlays...`);
    const dismissSelectors = [
      // Common cookie banner buttons
      'button[id*="accept"]',
      'button[id*="cookie"]',
      'button[class*="accept"]',
      'button[class*="cookie"]',
      'button[aria-label*="accept"]',
      'button[aria-label*="cookie"]',
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      'button:has-text("Got it")',
      'button:has-text("OK")',
      'button:has-text("Close")',
      'a[class*="close"]',
      '[role="dialog"] button',
      '.cookie-banner button',
      '#cookie-banner button',
      // Common modal/overlay close buttons
      'button[aria-label="Close"]',
      'button[aria-label="Dismiss"]',
      '[data-testid="close-button"]',
      '.modal-close',
      '.overlay-close',
    ];

    let dismissed = 0;
    for (const selector of dismissSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 500 })) {
          await element.click({ timeout: 1000 });
          dismissed++;
          console.log(`   ✅ Dismissed overlay/banner using: ${selector}`);
          await page.waitForTimeout(500); // Wait for animation
          break; // Only dismiss one banner
        }
      } catch (e) {
        // Selector not found or not clickable, continue
      }
    }

    if (dismissed === 0) {
      console.log(`   ℹ️  No cookie banners or overlays detected`);
    }

    // Wait a bit more for any animations to complete
    await page.waitForTimeout(1000);

    // Perform custom actions if defined
    if (scenario?.actions && Array.isArray(scenario.actions)) {
      console.log(`   Executing ${scenario.actions.length} custom action(s)...`);
      for (const action of scenario.actions) {
        try {
          // Actions should be functions or objects with type and parameters
          if (typeof action === 'function') {
            await action(page);
          } else if (action.type === 'click') {
            await page.click(action.selector);
          } else if (action.type === 'fill') {
            await page.fill(action.selector, action.value);
          } else if (action.type === 'wait') {
            await page.waitForTimeout(action.duration || 1000);
          }
        } catch (error) {
          console.warn(`   ⚠️  Action failed: ${error.message}`);
        }
      }
    }

    // Run accessibility scan
    console.log(`   🔍 Running accessibility scan...`);
    console.log(`   📄 Scanning URL: ${page.url()}`);

    // Get page info for debugging
    const pageTitle = await page.title();
    console.log(`   📋 Page title: ${pageTitle}`);

    // Check for links without text (the main issue from screenshots)
    const linksWithoutText = await page.locator('a[href]:not([aria-label]):not([title])').evaluateAll(links => {
      return links.filter(link => {
        const text = link.textContent?.trim();
        const ariaLabel = link.getAttribute('aria-label');
        const title = link.getAttribute('title');
        const hasImage = link.querySelector('img[alt]');
        return !text && !ariaLabel && !title && !hasImage;
      }).length;
    });
    console.log(`   🔗 Links without accessible text found: ${linksWithoutText}`);

    // Check for list structure issues
    const listIssues = await page.locator('ul, ol').evaluateAll(lists => {
      return lists.filter(list => {
        const children = Array.from(list.children);
        return children.some(child =>
          !['LI', 'SCRIPT', 'TEMPLATE'].includes(child.tagName)
        );
      }).length;
    });
    console.log(`   📋 Lists with improper structure found: ${listIssues}`);

    // Run ALL axe-core rules (not just WCAG tags)
    // This includes best-practices and experimental rules
    const axeBuilder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice', 'experimental']);

    // Add exclusions
    if (config.exclude && config.exclude.length > 0) {
      config.exclude.forEach(selector => {
        axeBuilder.exclude(selector);
      });
    }

    const results = await axeBuilder.analyze();

    // Debug output
    console.log(`   ✅ Scan complete`);
    console.log(`   🔍 Axe version: ${results.testEngine.version}`);
    console.log(`   📊 Rules run: ${results.passes.length + results.violations.length + results.incomplete.length + results.inapplicable.length}`);
    console.log(`   ✅ Passed: ${results.passes.length}`);
    console.log(`   ⚠️  Violations: ${results.violations.length}`);
    console.log(`   ⚠️  Incomplete: ${results.incomplete.length}`);
    console.log(`   ℹ️  Inapplicable: ${results.inapplicable.length}`);

    // Debug: Check why link-name might be inapplicable
    const linkNameInApplicable = results.inapplicable.find(r => r.id === 'link-name');
    if (linkNameInApplicable && linksWithoutText > 0) {
      console.log(`\n   🔍 DEBUG: link-name is inapplicable but we found ${linksWithoutText} links without text`);
      console.log(`      This might mean the links have aria-label or other attributes axe accepts`);
      console.log(`      Checking first few links manually...`);

      const problematicLinks = await page.locator('a[href]').evaluateAll(links => {
        return links.slice(0, 10).map(link => ({
          href: link.getAttribute('href'),
          text: link.textContent?.trim(),
          ariaLabel: link.getAttribute('aria-label'),
          title: link.getAttribute('title'),
          hasImgWithAlt: !!link.querySelector('img[alt]'),
          innerHTML: link.innerHTML.substring(0, 100)
        }));
      });

      console.log(`      Sample links:`, JSON.stringify(problematicLinks.slice(0, 3), null, 2));
    }

    // Show incomplete checks (these might need manual review)
    if (results.incomplete.length > 0) {
      console.log(`\n   🔍 Incomplete checks (require manual review):`);
      results.incomplete.forEach((item, index) => {
        console.log(`      ${index + 1}. ${item.id}: ${item.description}`);
        console.log(`         Nodes: ${item.nodes.length}`);
      });
    }

    // Optionally treat incomplete as violations (BEFORE generating reports)
    let allViolations = results.violations;
    if (config.treatIncompleteAsViolations && results.incomplete.length > 0) {
      console.log(`\n   ⚠️  Treating ${results.incomplete.length} incomplete checks as violations`);
      allViolations = [...results.violations, ...results.incomplete];
    }

    // Create reports directory
    const reportsDir = path.resolve(config.outputDir);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate filename-safe name
    const safeName = (testName || 'test')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportBaseName = `${safeName}-${config.browser}-${timestamp}`;

    // Save JSON report (include both original and modified results)
    const jsonReportPath = path.join(reportsDir, `${reportBaseName}.json`);
    const reportData = {
      ...results,
      _meta: {
        treatIncompleteAsViolations: config.treatIncompleteAsViolations,
        allViolations: allViolations.length,
        manualChecks: {
          linksWithoutText,
          listIssues
        }
      }
    };
    fs.writeFileSync(
      jsonReportPath,
      JSON.stringify(reportData, null, 2),
      'utf8'
    );
    console.log(`   📄 JSON report: ${jsonReportPath}`);

    // Save HTML report (use allViolations instead of results.violations)
    const modifiedResults = {
      ...results,
      violations: allViolations
    };
    const htmlReport = generateHTMLReport(
      modifiedResults,
      testName,
      page.url(),
      config.name || 'Accessibility Test'
    );
    const htmlReportPath = path.join(reportsDir, `${reportBaseName}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport, 'utf8');
    console.log(`   📄 HTML report: ${htmlReportPath}`);

    // Take screenshot
    const screenshotPath = path.join(reportsDir, `${reportBaseName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   📸 Screenshot: ${screenshotPath}`);

    // Count violations by severity (already calculated above with allViolations)
    const violationsBySeverity = {
      critical: allViolations.filter(v => v.impact === 'critical').length,
      serious: allViolations.filter(v => v.impact === 'serious').length,
      moderate: allViolations.filter(v => v.impact === 'moderate').length,
      minor: allViolations.filter(v => v.impact === 'minor').length,
      incomplete: config.treatIncompleteAsViolations ? results.incomplete.length : 0,
    };

    // Log violations summary
    if (allViolations.length > 0) {
      console.log(`\n   ⚠️  Found ${allViolations.length} accessibility violations:`);
      console.log(`      Critical: ${violationsBySeverity.critical}`);
      console.log(`      Serious: ${violationsBySeverity.serious}`);
      console.log(`      Moderate: ${violationsBySeverity.moderate}`);
      console.log(`      Minor: ${violationsBySeverity.minor}`);
      if (violationsBySeverity.incomplete > 0) {
        console.log(`      Incomplete (treated as violations): ${violationsBySeverity.incomplete}`);
      }

      console.log(`\n   📋 Violation Details:`);
      allViolations.forEach((violation, index) => {
        const emoji = violation.impact === 'critical' ? '🔴' :
                     violation.impact === 'serious' ? '🟠' :
                     violation.impact === 'moderate' ? '🟡' : '⚪';
        console.log(`\n   ${emoji} ${index + 1}. [${violation.impact.toUpperCase()}] ${violation.id}`);
        console.log(`      ${violation.description}`);
        console.log(`      Nodes affected: ${violation.nodes.length}`);
        console.log(`      Help: ${violation.helpUrl}`);
      });
    } else {
      console.log(`\n   ✅ No accessibility violations found!`);
    }

    // Determine if test should fail based on failOn setting
    const severityLevels = ['minor', 'moderate', 'serious', 'critical'];
    const failOnIndex = config.failOn === 'all' ? 0 : severityLevels.indexOf(config.failOn);

    let failingViolations = 0;
    if (config.failOn === 'all') {
      failingViolations = allViolations.length;
    } else {
      failingViolations = allViolations.filter(v => {
        const vIndex = severityLevels.indexOf(v.impact);
        return vIndex >= failOnIndex;
      }).length;
    }

    return {
      success: failingViolations === 0,
      violations: allViolations.length,
      critical: violationsBySeverity.critical,
      serious: violationsBySeverity.serious,
      moderate: violationsBySeverity.moderate,
      minor: violationsBySeverity.minor,
      incomplete: violationsBySeverity.incomplete,
      failingViolations: failingViolations,
      url: fullUrl,
      testName,
    };
  } catch (error) {
    console.error(`   ❌ Test failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      url: url,
      testName: scenario?.name || config.name || 'Test',
    };
  } finally {
    await page.close();
    await context.close();
  }
}

// Main execution
async function main() {
  const config = parseArgs();

  // Load config file if provided
  if (config.configFile) {
    try {
      const configPath = path.resolve(config.configFile);
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Merge file config with CLI args (CLI takes precedence)
      Object.keys(fileConfig).forEach(key => {
        if (config[key] === null || config[key] === undefined ||
            (Array.isArray(config[key]) && config[key].length === 0)) {
          config[key] = fileConfig[key];
        }
      });
    } catch (error) {
      console.error(`❌ Failed to load config file: ${error.message}`);
      process.exit(1);
    }
  }

  // Validate configuration
  if (!config.url && !config.baseUrl && !config.scenarios) {
    console.error('❌ Error: --url or --config with scenarios is required');
    printHelp();
    process.exit(1);
  }

  console.log('🚀 Starting Accessibility Tests');
  console.log(`   Browser: ${config.browser}`);
  console.log(`   Headless: ${config.headless}`);
  console.log(`   Output: ${config.outputDir}`);
  if (config.exclude.length > 0) {
    console.log(`   Excluding: ${config.exclude.join(', ')}`);
  }

  // Launch browser
  let browserType;
  switch (config.browser) {
    case 'firefox':
      browserType = firefox;
      break;
    case 'webkit':
      browserType = webkit;
      break;
    default:
      browserType = chromium;
  }

  const browser = await browserType.launch({ headless: config.headless });

  try {
    const results = [];

    // Test scenarios or single URL
    if (config.scenarios && config.scenarios.length > 0) {
      console.log(`\n📋 Testing ${config.scenarios.length} scenario(s)...\n`);
      for (const scenario of config.scenarios) {
        const result = await testUrl(browser, null, config, scenario);
        results.push(result);
      }
    } else {
      const result = await testUrl(browser, config.url, config);
      results.push(result);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalViolations = results.reduce((sum, r) => sum + (r.violations || 0), 0);
    const totalCritical = results.reduce((sum, r) => sum + (r.critical || 0), 0);
    const totalSerious = results.reduce((sum, r) => sum + (r.serious || 0), 0);
    const totalModerate = results.reduce((sum, r) => sum + (r.moderate || 0), 0);
    const totalMinor = results.reduce((sum, r) => sum + (r.minor || 0), 0);
    const totalFailing = results.reduce((sum, r) => sum + (r.failingViolations || 0), 0);

    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`\nViolations by Severity:`);
    console.log(`  🔴 Critical: ${totalCritical}`);
    console.log(`  🟠 Serious: ${totalSerious}`);
    console.log(`  🟡 Moderate: ${totalModerate}`);
    console.log(`  ⚪ Minor: ${totalMinor}`);
    console.log(`  📊 Total: ${totalViolations}`);
    console.log(`\nFail Threshold: ${config.failOn} and above`);
    console.log(`Violations Meeting Threshold: ${totalFailing}`);
    console.log('='.repeat(60));

    // Exit with error code if any violations meet the fail threshold
    if (totalFailing > 0) {
      console.log(`\n❌ Tests failed: ${totalFailing} violations at ${config.failOn} level or above`);
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testUrl, generateHTMLReport, navigateWithPassword };
