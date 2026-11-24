/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';
import {
  ADD_PROVIDER,
  ENDPOINT,
  mockOpenRouter,
  runCommand,
  saveEndpoint
} from './test-utils';

const MODELS_FILE = '.pi/agent/models.json';

test.describe('Commands', () => {
  test.beforeEach(async ({ page }) => {
    await mockOpenRouter(page);
  });

  test.afterEach(async ({ page }) => {
    await page.contents.deleteDirectory('.pi');
  });

  test('should add and remove an endpoint', async ({ page }) => {
    await runCommand(page, ADD_PROVIDER);
    await saveEndpoint(page);
    await expect.poll(() => page.contents.fileExists(MODELS_FILE)).toBe(true);

    await runCommand(page, ADD_PROVIDER);
    const dialog = page.locator('.jp-Dialog');
    await dialog
      .getByLabel('Provider')
      .selectOption({ label: `${ENDPOINT.name} (endpoint)` });
    await expect(dialog.getByLabel('Base URL')).toHaveValue(ENDPOINT.baseUrl);
    await expect(
      dialog.getByLabel('Model ids, separated by commas')
    ).toHaveValue(ENDPOINT.model);
    await dialog.getByRole('button', { name: 'Remove' }).click();

    await expect(
      page.locator('.Toastify__toast', {
        hasText: `Removed the ${ENDPOINT.name} endpoint from pi.`
      })
    ).toBeVisible();
  });

  test('should open the agent folder', async ({ page }) => {
    await runCommand(page, 'Pi: Open the Agent Folder');

    await expect
      .poll(() => page.filebrowser.getCurrentDirectory())
      .toBe('.pi/agent');
  });
});
