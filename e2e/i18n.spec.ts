import { expect, test } from '@playwright/test';

const MASTER_PASSWORD = 'SenhaMultiLang2026!';

test.describe('MyFBox Multilingual E2E (pt-BR, en-GB, es, zh-CN)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        indexedDB.deleteDatabase('myfbox_encrypted_vault_db');
      } catch {
        /* ignore */
      }
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await page.reload();
  });

  test('troca de idioma na tela de bloqueio e persistência no localStorage', async ({ page }) => {
    const consoleErrors: string[] = [];
    const externalRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://127.0.0.1:41730') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }
    });

    await page.goto('/');

    // Inicialmente pt-BR
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('tab', { name: /^Criar cofre$/i })).toBeVisible({ timeout: 10_000 });

    // Troca para en-GB
    const langSelect = page.locator('select[aria-label]').first();
    await langSelect.selectOption('en-GB');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(page.getByRole('tab', { name: /^Create vault$/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Personal finances/i)).toBeVisible();

    // Troca para es
    await langSelect.selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('tab', { name: /^Crear b/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Finanzas personales/i)).toBeVisible();

    // Troca para zh-CN
    await langSelect.selectOption('zh-CN');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.getByRole('tab', { name: /^创建保险库$/i })).toBeVisible();
    await expect(page.getByPlaceholder(/个人财务/)).toBeVisible();

    // Recarrega e confirma persistência em zh-CN
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.getByRole('tab', { name: /^创建保险库$/i })).toBeVisible();

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('cria cofre em en-GB, navega pelas abas e alterna dinamicamente entre idiomas', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const externalRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://127.0.0.1:41730') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }
    });

    await page.goto('/');

    // Define idioma inicial para en-GB
    const langSelect = page.locator('select[aria-label]').first();
    await langSelect.selectOption('en-GB');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');

    // Passo 1: Criação em en-GB
    await page.getByPlaceholder(/Personal finances/i).fill('UK Vault');
    await page.locator('input[type="password"]').first().fill(MASTER_PASSWORD);
    await page.getByPlaceholder('Repeat password').fill(MASTER_PASSWORD);
    await page.locator('form button[type="submit"]').click();

    // Passo 2: Conta inicial em en-GB
    await page.getByPlaceholder(/e\.g\. Current Account/i).fill('Main Account');
    await page.getByPlaceholder('0.00').fill('2500.00');
    await page.getByRole('button', { name: /Create vault and start/i }).click();

    // App desbloqueado em en-GB
    await expect(page.getByText('Main Account')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /^Overview$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Transactions/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Accounts/i })).toBeVisible();

    // Troca para es pelo seletor do header
    const headerLang = page.locator('.workspace-header select[aria-label]').first();
    await headerLang.selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('button', { name: /^Resumen$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Movimientos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Cuentas/i })).toBeVisible();

    // Troca para zh-CN pelo seletor do header
    await headerLang.selectOption('zh-CN');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.getByRole('button', { name: /^概览$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^交易记录/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^账户/i })).toBeVisible();

    // Troca para pt-BR pelo seletor do header
    await headerLang.selectOption('pt-BR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('button', { name: /^Visão Geral$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Lançamentos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Contas/i })).toBeVisible();

    // Abre modal de transação em pt-BR via atalho N
    await page.keyboard.press('n');
    await expect(page.getByRole('button', { name: /Registrar no Cofre/i })).toBeVisible();
    await page.keyboard.press('Escape');

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
