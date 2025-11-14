# Standalone Accessibility Testing Script

A portable, framework-agnostic accessibility testing tool that can test any website for WCAG 2.0/2.1 Level A/AA compliance using axe-core and Playwright.

## Features

- ✅ Test any website (no Shopify dependencies)
- ✅ WCAG 2.0/2.1 Level A/AA compliance testing
- ✅ Support for password-protected sites
- ✅ Multiple browser support (Chromium, Firefox, WebKit)
- ✅ Custom test scenarios with navigation actions
- ✅ HTML and JSON reports with screenshots
- ✅ Command-line interface or config file
- ✅ Exclude specific elements from testing

## Installation

```bash
# Install dependencies (if not already installed)
npm install playwright @axe-core/playwright
```

## Quick Start

### Test a Single URL

```bash
node testing/standalone-a11y-test.js --url https://example.com
```

### Test with Password Protection

```bash
node testing/standalone-a11y-test.js \
  --url https://staging.example.com \
  --password mypassword
```

### Test Multiple Pages with Config File

```bash
node testing/standalone-a11y-test.js --config my-test-config.json
```

## Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url` | URL to test (required if no config file) | - |
| `--password` | Password for password-protected sites | - |
| `--output` | Output directory for reports | `./a11y-reports` |
| `--name` | Test name for report files | Derived from URL |
| `--browser` | Browser: `chromium`, `firefox`, `webkit` | `chromium` |
| `--config` | JSON config file with test scenarios | - |
| `--headless` | Run in headless mode | `true` |
| `--exclude` | CSS selectors to exclude (comma-separated) | - |
| `--fail-on` | Severity to fail on: `critical`, `serious`, `moderate`, `minor`, `all` | `serious` |
| `--treat-incomplete-as-violations` | Treat incomplete checks as violations (recommended) | `false` |
| `--help` | Show help message | - |

## Configuration File Format

Create a JSON file with your test configuration:

```json
{
  "baseUrl": "https://example.com",
  "password": "optional-password",
  "outputDir": "./a11y-reports",
  "browser": "chromium",
  "headless": true,
  "exclude": [
    "#cookie-banner",
    ".third-party-widget"
  ],
  "scenarios": [
    {
      "name": "Homepage",
      "path": "/"
    },
    {
      "name": "About Page",
      "path": "/about"
    },
    {
      "name": "Products with Filter",
      "path": "/products",
      "actions": [
        {
          "type": "click",
          "selector": ".filter-button"
        },
        {
          "type": "wait",
          "duration": 1000
        }
      ]
    }
  ]
}
```

See `standalone-a11y-config.example.json` for a complete example.

## Usage Examples

### Basic Testing

```bash
# Test a single page
node testing/standalone-a11y-test.js --url https://example.com

# Test with custom output directory
node testing/standalone-a11y-test.js \
  --url https://example.com \
  --output ./my-reports

# Test with Firefox
node testing/standalone-a11y-test.js \
  --url https://example.com \
  --browser firefox

# Test in non-headless mode (see browser)
node testing/standalone-a11y-test.js \
  --url https://example.com \
  --headless false
```

### Advanced Testing

```bash
# Exclude specific elements
node testing/standalone-a11y-test.js \
  --url https://example.com \
  --exclude "#cookie-banner,.ads-widget"

# Fail on all violations (including minor)
node testing/standalone-a11y-test.js \
  --url https://example.com \
  --fail-on all

# Treat incomplete checks as violations (recommended for thorough testing)
node testing/standalone-a11y-test.js \
  --url https://example.com \
  --treat-incomplete-as-violations \
  --fail-on all

# Test multiple scenarios from config
node testing/standalone-a11y-test.js \
  --config my-test-config.json

# Override config file settings
node testing/standalone-a11y-test.js \
  --config my-test-config.json \
  --browser firefox \
  --output ./custom-reports
```

## Custom Actions in Scenarios

You can define custom actions to perform before running accessibility tests:

```json
{
  "name": "Search Results",
  "path": "/search",
  "actions": [
    {
      "type": "fill",
      "selector": "#search-input",
      "value": "test query"
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
```

### Supported Action Types

- **`click`**: Click an element
  ```json
  { "type": "click", "selector": ".button" }
  ```

- **`fill`**: Fill a form field
  ```json
  { "type": "fill", "selector": "#input", "value": "text" }
  ```

- **`wait`**: Wait for a duration
  ```json
  { "type": "wait", "duration": 1000 }
  ```

## Output Reports

The script generates three types of output for each test:

1. **HTML Report** - Visual report with detailed violation information
2. **JSON Report** - Machine-readable report with full axe-core results
3. **Screenshot** - Full-page screenshot of the tested page

All reports are saved to the output directory with timestamped filenames:
```
a11y-reports/
├── homepage-chromium-2025-01-13-17-30-00.html
├── homepage-chromium-2025-01-13-17-30-00.json
└── homepage-chromium-2025-01-13-17-30-00.png
```

## Understanding Results

### Violation Severity Levels

- **Critical** - Must be fixed immediately
- **Serious** - Should be fixed as soon as possible
- **Moderate** - Should be fixed
- **Minor** - Nice to fix

### Incomplete Checks

Some accessibility issues cannot be automatically determined and are marked as "incomplete". These require manual review and often indicate real problems. Use `--treat-incomplete-as-violations` to fail tests when incomplete checks are found.

Common incomplete checks:
- `color-contrast` - When background colors can't be determined
- `aria-hidden-focus` - When focusable elements might be hidden
- `aria-allowed-role` - When role usage needs manual verification

### Configurable Failure Thresholds

Use `--fail-on` to control which severity levels cause test failures:

```bash
# Fail only on critical issues
node a11y.test.js --url https://example.com --fail-on critical

# Fail on serious and above (default)
node a11y.test.js --url https://example.com --fail-on serious

# Fail on any violation
node a11y.test.js --url https://example.com --fail-on all
```

### Exit Codes

- `0` - All tests passed (no violations meeting the `--fail-on` threshold)
- `1` - Tests failed (violations found at or above the `--fail-on` threshold)

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Accessibility Tests
  run: |
    node testing/standalone-a11y-test.js \
      --config test-config.json \
      --output ./a11y-reports

- name: Upload Reports
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: accessibility-reports
    path: a11y-reports/
```

### GitLab CI Example

```yaml
accessibility-test:
  script:
    - node testing/standalone-a11y-test.js --config test-config.json
  artifacts:
    when: always
    paths:
      - a11y-reports/
```

## Troubleshooting

### Password Protection Not Working

Make sure the site uses a standard password form with:
- `<input type="password">` for the password field
- `<button type="submit">` or `<input type="submit">` for submission

### Tests Timing Out

The script uses a 60-second timeout and waits for the page `load` event (not `networkidle`) to avoid timeouts on sites with continuous background requests.

If you still experience timeouts:
1. Check your network connection
2. Try running in non-headless mode to see what's happening
3. Add explicit wait actions in your config:

```json
{
  "type": "wait",
  "duration": 3000
}
```

### Elements Not Found

Use browser DevTools to verify selectors:
```bash
# Run in non-headless mode to debug
node testing/standalone-a11y-test.js \
  --url https://example.com \
  --headless false
```

### Too Many Violations from Third-Party Content

Exclude third-party widgets and ads:
```bash
node testing/standalone-a11y-test.js \
  --url https://example.com \
  --exclude "#ads,.social-widgets,.cookie-banner"
```

### Cookie Banners Blocking Content

The script automatically attempts to dismiss common cookie banners and overlays before scanning. If violations are still being blocked:

1. Add the cookie banner to exclusions:
```bash
node a11y.test.js --url https://example.com --exclude "#cookie-consent"
```

2. Or add a custom action to dismiss it:
```json
{
  "actions": [
    {
      "type": "click",
      "selector": "#accept-cookies"
    },
    {
      "type": "wait",
      "duration": 500
    }
  ]
}
```

## Differences from Original Script

This standalone version removes:
- Shopify-specific dependencies (store-resolver, storefront-api)
- Theme preview parameters
- Store configuration system
- Brand-specific scenarios

And adds:
- Universal URL testing
- Flexible configuration system
- Command-line interface
- Multiple browser support
- Custom action support

## License

Same as parent project.
