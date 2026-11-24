/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';
import {
  CHAT_NAME,
  createChat,
  CUSTOM_PROVIDER,
  mockModel,
  mockOpenRouter,
  sendMessage
} from './test-utils';

const SESSIONS_FOLDER = '.pi/agent/sessions/jupyter-chats';

test.use({
  mockSettings: { ...galata.DEFAULT_SETTINGS, ...CUSTOM_PROVIDER.settings }
});

test.describe('Custom provider', () => {
  test.beforeEach(async ({ page }) => {
    await mockOpenRouter(page);
  });

  test.afterEach(async ({ page }) => {
    await page.contents.deleteDirectory('.pi');
  });

  test('should answer with the model of the provider', async ({ page }) => {
    const requests = await mockModel(
      page,
      ['Hello from the provider.'],
      CUSTOM_PROVIDER.baseUrl
    );
    const chat = await createChat(page);

    await chat.getByRole('button', { name: CUSTOM_PROVIDER.model }).click();
    await expect(
      page.getByRole('menuitem', {
        name: `${CUSTOM_PROVIDER.model} ${CUSTOM_PROVIDER.id}`
      })
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await sendMessage(chat, 'Hello pi');
    await expect(chat.locator('.jp-chat-rendered-message').last()).toHaveText(
      'Hello from the provider.'
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].model).toBe(CUSTOM_PROVIDER.model);
  });

  test('should restore the chat and its model after a reload', async ({
    page
  }) => {
    const requests = await mockModel(
      page,
      ['The first answer.', 'The second answer.'],
      CUSTOM_PROVIDER.baseUrl
    );
    let chat = await createChat(page);
    await sendMessage(chat, 'Hello pi');
    await expect(chat.locator('.jp-chat-rendered-message').last()).toHaveText(
      'The first answer.'
    );

    // pi saves its session a moment after the answer.
    await expect
      .poll(async () => {
        const sessions = await page.contents.getContentMetadata(
          SESSIONS_FOLDER,
          'directory'
        );
        return sessions?.content;
      })
      .toHaveLength(1);

    // Galata waits for the launcher, which the restored layout does not have.
    await page.reload({ waitForIsReady: false });

    await page.activity.getTabLocator(CHAT_NAME).waitFor();
    chat = (await page.activity.getPanelLocator(CHAT_NAME))!;
    await expect(chat.locator('.jp-chat-rendered-message')).toHaveText([
      'Hello pi',
      'The first answer.'
    ]);
    await expect(
      chat.getByRole('button', { name: CUSTOM_PROVIDER.model })
    ).toBeVisible();

    await sendMessage(chat, 'Hello again');
    await expect(chat.locator('.jp-chat-rendered-message').last()).toHaveText(
      'The second answer.'
    );
    expect(requests[1].model).toBe(CUSTOM_PROVIDER.model);
    expect(requests[1].messages.map(message => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user'
    ]);
  });
});
