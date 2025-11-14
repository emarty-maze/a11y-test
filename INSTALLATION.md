# Installation Guide

## Publishing to npm

### 1. Prepare for Publishing

Make sure you have an npm account:
```bash
npm login
```

### 2. Test Locally First

Before publishing, test the package locally in another project:

```bash
# In the a11y package directory
npm link

# In another project directory
npm link @emarty-maze/a11y-test

# Test the command
a11y-test --help
```

### 3. Publish to npm

```bash
# Make sure everything is committed
git add .
git commit -m "Prepare for npm publish"

# Publish to npm (public scoped package)
npm publish --access public
```

### 4. Update Version for Future Releases

```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major

# Then publish
npm publish
```

---

## Installing in Other Projects

### Global Installation (Recommended for CLI use)

```bash
npm install -g @emarty-maze/a11y-test
```

Then use anywhere:
```bash
a11y-test --url https://example.com
```

### Local Installation (For project-specific use)

```bash
npm install --save-dev @emarty-maze/a11y-test
```

Add to your `package.json` scripts:
```json
{
  "scripts": {
    "test:a11y": "a11y-test --config a11y-config.json",
    "test:a11y:prod": "a11y-test --url https://mysite.com --fail-on all"
  }
}
```

Then run:
```bash
npm run test:a11y
```

### Using as a Module

You can also import and use programmatically:

```javascript
import { testUrl, generateHTMLReport } from '@emarty-maze/a11y-test';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();

const config = {
  outputDir: './reports',
  failOn: 'serious',
  treatIncompleteAsViolations: true
};

const result = await testUrl(context, 'https://example.com', config);
console.log(`Found ${result.violations} violations`);

await context.close();
await browser.close();
```

---

## Usage Examples

### Basic Usage

```bash
# Test a single URL
a11y-test --url https://example.com

# Test with strict mode
a11y-test --url https://example.com --treat-incomplete-as-violations --fail-on all

# Test password-protected site
a11y-test --url https://staging.example.com --password mypass
```

### Using Config Files

Create `a11y-config.json`:
```json
{
  "baseUrl": "https://example.com",
  "scenarios": [
    { "name": "Homepage", "path": "/" },
    { "name": "About", "path": "/about" }
  ]
}
```

Run:
```bash
a11y-test --config a11y-config.json
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run accessibility tests
        run: npx a11y-test --config a11y-config.json --fail-on serious

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: a11y-reports
          path: a11y-reports/
```

#### GitLab CI

```yaml
accessibility-test:
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  script:
    - npm install -g @emarty/a11y-test
    - a11y-test --config a11y-config.json
  artifacts:
    when: always
    paths:
      - a11y-reports/
```

---

## Troubleshooting

### "Command not found: a11y-test"

If installed globally, make sure npm global bin is in your PATH:
```bash
npm config get prefix
# Add the bin directory to your PATH
```

Or use npx:
```bash
npx @emarty/a11y-test --url https://example.com
```

### Playwright Installation Issues

Install Playwright browsers:
```bash
npx playwright install chromium
```

Or with dependencies:
```bash
npx playwright install --with-deps chromium
```

### Permission Errors on Linux/Mac

```bash
sudo npm install -g @emarty/a11y-test
# Or use nvm to avoid sudo
```

---

## Uninstalling

### Global
```bash
npm uninstall -g @emarty/a11y-test
```

### Local
```bash
npm uninstall @emarty/a11y-test
```

---

## Getting Help

```bash
a11y-test --help
```

For issues and feature requests, visit:
https://github.com/emarty/a11y-test/issues
