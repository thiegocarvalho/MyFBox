import { expect, test } from '@playwright/test';

const MASTER_PASSWORD = 'MinhaSenhaE2E!2026';

test.describe('MyFBox E2E (Web + CSP + IndexedDB)', () => {
  test('cria cofre, registra lançamento com atalho N, recarrega, rejeita senha errada e destrava', async ({
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

    // Passo 1 da criação do cofre
    await page.getByPlaceholder('Ex: Finanças pessoais').fill('Cofre E2E');
    await page.locator('input[type="password"]').first().fill(MASTER_PASSWORD);
    await page.getByPlaceholder('Repita a senha').fill(MASTER_PASSWORD);
    await page.locator('form button[type="submit"]').click();

    // Passo 2: conta inicial
    await page.getByPlaceholder('Ex: Conta Corrente, Carteira, Nubank...').fill('Conta Principal');
    await page.getByPlaceholder('0,00').fill('1500.00');
    await page.getByRole('button', { name: /Criar cofre e começar/i }).click();

    // Deve entrar no app desbloqueado
    await expect(page.getByText('Conta Principal')).toBeVisible({ timeout: 15_000 });

    // Abre modal de lançamento via atalho 'N'
    await page.keyboard.press('n');
    await expect(page.getByRole('button', { name: /Registrar no Cofre/i })).toBeVisible();

    await page.getByPlaceholder('0,00').fill('125,50');
    await page.locator('#tx-desc').fill('Supermercado E2E');
    await page.getByRole('button', { name: /Registrar no Cofre/i }).click();

    await expect(page.getByText('Supermercado E2E')).toBeVisible();

    // Recarrega a página: deve exigir senha mestra (IndexedDB preservado)
    await page.reload();
    await expect(page.getByRole('button', { name: /Desbloquear cofre/i })).toBeVisible();

    // Testa senha incorreta
    await page.locator('input[type="password"]').first().fill('SenhaErrada!999');
    await page.getByRole('button', { name: /Desbloquear cofre/i }).click();
    await expect(page.getByText(/Senha mestra incorreta/i)).toBeVisible({ timeout: 10_000 });

    // Destrava com senha correta e confirma persistência do saldo e do lançamento
    await page.locator('input[type="password"]').first().fill(MASTER_PASSWORD);
    await page.getByRole('button', { name: /Desbloquear cofre/i }).click();
    await expect(page.getByText('R$ 1.374,50').first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Lançamentos \(1\)/i }).click();
    await expect(page.getByText('Supermercado E2E')).toBeVisible();

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
