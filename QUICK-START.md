# Quick Start: Standalone Accessibility Testing

## Installation

The script uses Playwright and axe-core. If you're in the ELC-Horizon project, these are already installed. For standalone use elsewhere:

```bash
npm install playwright @axe-core/playwright
```

## 5-Minute Quick Start

### 1. Test Any Website

```bash
# Using npm script
npm run a11y:test -- --url https://example.com

# Or directly
node a11y-test.js --url https://example.com
```

### 2. Test Password-Protected Site

```bash
npm run a11y:test -- \
  --url https://staging.mysite.com \
  --password mypassword
```

### 3. Test Multiple Pages

Create a config file `my-test.json`:

```json
{
  "baseUrl": "https://example.com",
  "scenarios": [
    { "name": "Homepage", "path": "/" },
    { "name": "About", "path": "/about" },
    { "name": "Contact", "path": "/contact" }
  ]
}
```

Run the tests:

```bash
npm run a11y:test -- --config my-test.json
```

## Common Use Cases

### Test Competitor Website

```bash
npm run a11y:test -- \
  --url https://competitor.com \
  --output ./competitor-a11y-reports
```

### Test Client's Staging Site

```bash
npm run a11y:test -- \
  --url https://staging.client.com \
  --password stagingpass \
  --name "Client Staging Test"
```

### Test with Different Browsers

```bash
# Test with Firefox
npm run a11y:test -- --url https://example.com --browser firefox

# Test with WebKit (Safari)
npm run a11y:test -- --url https://example.com --browser webkit
```

### Exclude Third-Party Widgets

```bash
npm run a11y:test -- \
  --url https://example.com \
  --exclude "#cookie-banner,.social-widgets,.ads"
```

### Strict Testing (Recommended)

```bash
# Fail on all violations and treat incomplete checks as violations
node a11y.test.js \
  --url https://example.com \
  --treat-incomplete-as-violations \
  --fail-on all
```

### Control Failure Threshold

```bash
# Only fail on critical issues
node a11y.test.js --url https://example.com --fail-on critical

# Fail on serious and above (default)
node a11y.test.js --url https://example.com --fail-on serious

# Fail on any violation
node a11y.test.js --url https://example.com --fail-on all
```

### Watch the Test Run (Non-Headless)

```bash
npm run a11y:test -- \
  --url https://example.com \
  --headless false
```

## Real-World Example

Test a complete e-commerce site:

**config.json:**
```json
{
  "baseUrl": "https://shop.example.com",
  "password": "preview123",
  "outputDir": "./ecommerce-a11y-reports",
  "exclude": [
    "#cookie-consent",
    ".chat-widget",
    "#google-reviews"
  ],
  "scenarios": [
    {
      "name": "Homepage",
      "path": "/"
    },
    {
      "name": "Product Listing",
      "path": "/collections/all"
    },
    {
      "name": "Product Detail",
      "path": "/products/sample-product"
    },
    {
      "name": "Cart",
      "path": "/cart"
    },
    {
      "name": "Search Results",
      "path": "/search",
      "actions": [
        {
          "type": "fill",
          "selector": "#search-input",
          "value": "shoes"
        },
        {
          "type": "click",
          "selector": "#search-button"
        },
        {
          "type": "wait",
          "duration": 2000
        }
      ]
    }
  ]
}
```

Run it:
```bash
npm run a11y:test -- --config config.json
```

## Understanding the Output

After running tests, you'll find in your output directory:

```
a11y-reports/
├── homepage-chromium-2025-01-13-17-30-00.html    ← Open this in browser
├── homepage-chromium-2025-01-13-17-30-00.json    ← Raw data
├── homepage-chromium-2025-01-13-17-30-00.md      ← Copy to Confluence
├── homepage-chromium-2025-01-13-17-30-00.png     ← Screenshot
├── about-chromium-2025-01-13-17-30-15.html
├── about-chromium-2025-01-13-17-30-15.json
├── about-chromium-2025-01-13-17-30-15.md
└── about-chromium-2025-01-13-17-30-15.png
```

**Open the HTML files** to see:
- Total violations count
- Severity levels (Critical, Serious, Moderate, Minor)
- Specific elements with issues
- Links to WCAG documentation
- How to fix each issue

**Use the Markdown (.md) files** to:
- Copy/paste directly into Confluence pages
- Add to GitHub/GitLab issues or pull requests
- Include in documentation
- Share formatted reports via email or Slack

## Tips & Tricks

### 1. Start Simple
```bash
# Just test one page first
npm run a11y:test -- --url https://example.com
```

### 2. Iterate and Refine
```bash
# Add exclusions as you discover false positives
npm run a11y:test -- \
  --url https://example.com \
  --exclude "#ads,.widgets"
```

### 3. Test Critical Paths
Focus on the most important user journeys:
- Homepage
- Main navigation
- Product/service pages
- Forms and checkout
- Search functionality

### 4. Use in CI/CD
```bash
# Add to your CI pipeline
npm run a11y:test -- --config production-a11y.json
```

### 5. Compare Before/After
```bash
# Before changes
npm run a11y:test -- --url https://staging.com --output ./before

# After changes
npm run a11y:test -- --url https://staging.com --output ./after

# Compare violation counts
```

## Troubleshooting

### "Cannot find module 'playwright'"
```bash
npm install playwright @axe-core/playwright
```

### Password not working
Make sure the site has a standard password form. Test in non-headless mode:
```bash
npm run a11y:test -- \
  --url https://staging.com \
  --password mypass \
  --headless false
```

### Too many violations
Start by fixing Critical and Serious issues first:
1. Open the HTML report
2. Focus on red (Critical) and orange (Serious) violations
3. Ignore Minor violations initially
4. Use `--fail-on critical` to only fail on critical issues while you fix them

### Incomplete checks showing up
Incomplete checks require manual review but often indicate real issues. To treat them as violations:
```bash
node a11y.test.js \
  --url https://example.com \
  --treat-incomplete-as-violations
```

### Tests timing out
The script now uses a 60-second timeout and waits for page load (not network idle). If you still have issues, add wait actions:
```json
{
  "actions": [
    { "type": "wait", "duration": 3000 }
  ]
}
```

## Next Steps

1. **Read the full documentation**: `testing/STANDALONE-A11Y-README.md`
2. **Create your config file**: Use `testing/standalone-a11y-config.example.json` as a template
3. **Integrate with CI/CD**: Add to your deployment pipeline
4. **Schedule regular tests**: Run weekly or before major releases

## Get Help

```bash
# Show all options
npm run a11y:help

# Or
node testing/standalone-a11y-test.js --help
```

## Example Output

```
🚀 Starting Accessibility Tests
   Browser: chromium
   Headless: true
   Output: ./a11y-reports

🔍 Testing: Homepage
   URL: https://example.com
   Running accessibility scan...
   📄 JSON report: ./a11y-reports/homepage-chromium-2025-01-13.json
   📄 HTML report: ./a11y-reports/homepage-chromium-2025-01-13.html
   📸 Screenshot: ./a11y-reports/homepage-chromium-2025-01-13.png

   ⚠️  Found 3 accessibility violations:

   1. color-contrast: Elements must have sufficient color contrast
      Impact: serious
      Nodes affected: 5
      Help: https://dequeuniversity.com/rules/axe/4.4/color-contrast

   2. link-name: Links must have discernible text
      Impact: serious
      Nodes affected: 2
      Help: https://dequeuniversity.com/rules/axe/4.4/link-name

   3. image-alt: Images must have alternate text
      Impact: critical
      Nodes affected: 1
      Help: https://dequeuniversity.com/rules/axe/4.4/image-alt

============================================================
📊 Test Summary
============================================================
Total Tests: 1
Passed: 0 ✅
Failed: 1 ❌
Total Violations: 3
Critical/Serious: 3
============================================================

❌ Tests failed due to critical/serious accessibility violations
```
