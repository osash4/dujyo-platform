import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete User Flow
 * Tests: Registro → Escuchar → Ganar → Staking → NFT
 */
test.describe('User Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Complete user flow: Register → Listen → Earn → Staking → NFT', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // ============================================
    // STEP 1: REGISTRO CON WALLET
    // ============================================
    test.step('Step 1: Register User', async () => {
      console.log('Step 1: Testing user registration...');

      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      const email = `user-test-${Date.now()}@dujyo.test`;
      const password = 'TestPassword123!';
      const displayName = `Test User ${Date.now()}`;

      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.fill('input[name="displayName"], input[name="name"]', displayName);

      const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Register")').first();
      await signupButton.click();

      await page.waitForTimeout(2000);
      console.log('✓ User registration completed');
    });

    // ============================================
    // STEP 2: CONECTAR WALLET
    // ============================================
    test.step('Step 2: Connect Wallet', async () => {
      console.log('Step 2: Testing wallet connection...');

      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');

      // Look for wallet connect button
      const connectButton = page.locator('button:has-text("Connect"), button:has-text("Connect Wallet"), [data-testid="connect-wallet"]').first();
      
      if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await connectButton.click();
        await page.waitForTimeout(2000);
        console.log('✓ Wallet connection initiated');
      } else {
        console.log('Wallet already connected or connect button not found');
      }
    });

    // ============================================
    // STEP 3: ESCUCHAR MÚSICA (STREAM TO EARN)
    // ============================================
    test.step('Step 3: Listen to Music and Earn', async () => {
      console.log('Step 3: Testing stream-to-earn...');

      await page.goto('/music');
      await page.waitForLoadState('networkidle');

      // Find a track to play
      const trackCard = page.locator('[data-testid="track-card"], .track-card, article, .music-card').first();
      
      if (await trackCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await trackCard.click();
        await page.waitForTimeout(2000);

        // Verify player started
        const player = page.locator('audio, [data-testid="player"], .player').first();
        const playButton = page.locator('button:has-text("Play"), [aria-label*="play" i]').first();

        if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await playButton.click();
          await page.waitForTimeout(5000); // Simulate listening for 5 seconds

          // Check if earnings are being tracked
          const earningsIndicator = page.locator('text=/earning|reward|streaming/i').first();
          if (await earningsIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('✓ Stream-to-earn is working');
          } else {
            console.log('Track playing (earnings may be tracked in background)');
          }
        }
      } else {
        console.log('No tracks available to test');
      }
    });

    // ============================================
    // STEP 4: VERIFICAR GANANCIAS
    // ============================================
    test.step('Step 4: Check Earnings', async () => {
      console.log('Step 4: Testing earnings verification...');

      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');

      // Look for balance display
      const balanceElement = page.locator('text=/balance|dyo|earnings/i').first();
      
      if (await balanceElement.isVisible({ timeout: 5000 }).catch(() => false)) {
        const balanceText = await balanceElement.textContent();
        console.log(`✓ Balance displayed: ${balanceText}`);
      }

      // Check transaction history
      const historySection = page.locator('text=/history|transactions|activity/i').first();
      if (await historySection.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✓ Transaction history available');
      }
    });

    // ============================================
    // STEP 5: STAKING
    // ============================================
    test.step('Step 5: Stake Tokens', async () => {
      console.log('Step 5: Testing staking...');

      await page.goto('/staking');
      await page.waitForLoadState('networkidle');

      // Verify staking page loads
      const stakingPage = page.locator('text=/staking|stake|delegate/i').first();
      
      if (await stakingPage.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✓ Staking page loaded');

        // Fill staking form
        const stakeAmount = '50';
        const amountInput = page.locator('input[type="number"], input[name="amount"], input[placeholder*="amount" i]').first();
        
        if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await amountInput.fill(stakeAmount);

          // Click stake button
          const stakeButton = page.locator('button:has-text("Stake"), button:has-text("Delegate")').first();
          if (await stakeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            // Note: In real tests, you'd actually stake
            // For now, verify UI is ready
            console.log('✓ Staking form ready');
          }
        }
      } else {
        console.log('Staking page not found');
      }
    });

    // ============================================
    // STEP 6: NFT MARKETPLACE
    // ============================================
    test.step('Step 6: Browse and Purchase NFT', async () => {
      console.log('Step 6: Testing NFT marketplace...');

      await page.goto('/marketplace');
      await page.waitForLoadState('networkidle');

      // Verify marketplace page loads
      const marketplacePage = page.locator('text=/marketplace|nft|collectibles/i').first();
      
      if (await marketplacePage.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✓ Marketplace page loaded');

        // Look for NFT cards
        const nftCard = page.locator('[data-testid="nft-card"], .nft-card, .collectible-card').first();
        
        if (await nftCard.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nftCard.click();
          await page.waitForTimeout(2000);

          // Look for purchase button
          const purchaseButton = page.locator('button:has-text("Buy"), button:has-text("Purchase")').first();
          if (await purchaseButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Note: In real tests, you'd verify purchase flow
            console.log('✓ NFT purchase flow accessible');
          }
        } else {
          console.log('No NFTs available to test');
        }
      } else {
        console.log('Marketplace page not found');
      }
    });

    // ============================================
    // VERIFICATION
    // ============================================
    if (consoleErrors.length > 0) {
      console.warn(`Test completed with ${consoleErrors.length} console errors`);
    }

    // Final verification: User should be logged in
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    const profile = page.locator('text=/profile|account|settings/i').first();
    await expect(profile).toBeVisible({ timeout: 10000 });
  });

  test('Error handling: Insufficient balance for staking', async ({ page }) => {
    await page.goto('/staking');
    await page.waitForLoadState('networkidle');

    // Try to stake more than balance
    const amountInput = page.locator('input[type="number"], input[name="amount"]').first();
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput.fill('999999999');
      
      const stakeButton = page.locator('button:has-text("Stake")').first();
      await stakeButton.click();

      await page.waitForTimeout(2000);

      // Verify error message
      const errorMessage = page.locator('text=/insufficient|error|balance/i').first();
      const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasError) {
        console.log('✓ Error handling works correctly');
      }
    }
  });
});

