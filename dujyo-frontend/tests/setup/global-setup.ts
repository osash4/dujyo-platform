import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs before all tests to prepare the test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('Setting up global test environment...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Check if backend is running
    const backendHealth = await fetch('http://localhost:8083/health')
      .then(res => res.ok)
      .catch(() => false);

    if (!backendHealth) {
      console.warn('⚠️  Backend is not running on http://localhost:8083');
      console.warn('   Some tests may fail. Start backend with: cd dujyo-backend && cargo run --release');
    } else {
      console.log('✅ Backend is running');
    }

    // Check if frontend is running
    const frontendHealth = await page.goto('http://localhost:5173')
      .then(() => true)
      .catch(() => false);

    if (!frontendHealth) {
      console.warn('⚠️  Frontend is not running on http://localhost:5173');
      console.warn('   Start frontend with: cd dujyo-frontend && npm run dev');
    } else {
      console.log('✅ Frontend is running');
    }

    // Create test data if needed
    // This could include:
    // - Test users
    // - Test content
    // - Test wallets
    // - Database cleanup

    console.log('✅ Global setup completed');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

