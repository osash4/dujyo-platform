const { chromium } = require('playwright');

async function checkNavigation() {
  console.log('🔍 Verificando navegación en ProfilePage...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Ir a la página de login primero
    console.log('📱 Navegando a login...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(2000);
    
    // Hacer login (asumiendo que hay credenciales de prueba)
    console.log('🔐 Intentando hacer login...');
    const emailInput = await page.locator('input[type="email"]');
    const passwordInput = await page.locator('input[type="password"]');
    const loginButton = await page.locator('button[type="submit"]');
    
    if (await emailInput.count() > 0) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await loginButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Ir al ProfilePage
    console.log('👤 Navegando a ProfilePage...');
    await page.goto('http://localhost:5173/profile');
    await page.waitForTimeout(3000);
    
    // Verificar la URL actual
    const currentUrl = page.url();
    console.log(`URL actual: ${currentUrl}`);
    
    // Verificar si hay algún mensaje de carga
    const loadingText = await page.locator('text=Cargando').count();
    console.log(`Elementos con texto "Cargando": ${loadingText}`);
    
    // Verificar si el Sidebar está visible
    console.log('🔍 Verificando Sidebar...');
    const sidebar = await page.locator('aside');
    const sidebarVisible = await sidebar.isVisible();
    console.log(`Sidebar visible: ${sidebarVisible}`);
    
    // Verificar también con otros selectores
    const sidebarByClass = await page.locator('.w-64.bg-gray-800');
    const sidebarByClassVisible = await sidebarByClass.isVisible();
    console.log(`Sidebar por clase visible: ${sidebarByClassVisible}`);
    
    // Verificar el div con estilo inline (nuevo sidebar de 80px)
    const sidebarDiv = await page.locator('div[style*="width: 80px"]');
    const sidebarDivVisible = await sidebarDiv.isVisible();
    console.log(`Sidebar div visible: ${sidebarDivVisible}`);
    
    // Verificar también el sidebar de 256px por si acaso
    const sidebarDivOld = await page.locator('div[style*="width: 256px"]');
    const sidebarDivOldVisible = await sidebarDivOld.isVisible();
    console.log(`Sidebar div (256px) visible: ${sidebarDivOldVisible}`);
    
    // Verificar si hay algún elemento con texto del sidebar
    const sidebarText = await page.locator('text=Home').count();
    console.log(`Elementos con texto "Home": ${sidebarText}`);
    
    // Verificar si hay algún elemento con texto "Navigation"
    const navigationText = await page.locator('text=Navigation').count();
    console.log(`Elementos con texto "Navigation": ${navigationText}`);
    
    if (sidebarVisible) {
      const sidebarItems = await page.locator('aside button').count();
      console.log(`Número de elementos en Sidebar: ${sidebarItems}`);
    }
    
    // Verificar si el BottomNavBar está visible
    console.log('🔍 Verificando BottomNavBar...');
    const bottomNav = await page.locator('[data-testid="bottom-nav"], .bottom-nav, nav, .fixed.bottom-0').first();
    const bottomNavVisible = await bottomNav.isVisible();
    console.log(`BottomNavBar visible: ${bottomNavVisible}`);
    
    // Verificar elementos específicos del nuevo BottomNavBar
    const searchInput = await page.locator('input[placeholder*="mood"]').count();
    console.log(`Search input encontrado: ${searchInput}`);
    
    const browseButton = await page.locator('text=Browse').count();
    console.log(`Browse button encontrado: ${browseButton}`);
    
    // Verificar si hay errores en la consola
    console.log('🔍 Verificando errores de consola...');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('❌ Errores encontrados:');
      errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No hay errores de consola');
    }
    
    // Tomar screenshot
    console.log('📸 Tomando screenshot...');
    await page.screenshot({ path: 'navigation-check.png', fullPage: true });
    console.log('Screenshot guardado como navigation-check.png');
    
    // Resultado final
    console.log('\n📊 RESUMEN:');
    console.log(`Sidebar visible: ${sidebarDivVisible ? '✅' : '❌'}`);
    console.log(`BottomNavBar visible: ${bottomNavVisible ? '✅' : '❌'}`);
    console.log(`Errores de consola: ${errors.length > 0 ? '❌' : '✅'}`);
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await browser.close();
  }
}

checkNavigation();
