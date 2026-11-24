/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';
import {
  ADD_PROVIDER,
  createChat,
  ENDPOINT,
  mockModel,
  mockOpenRouter,
  runCommand,
  saveEndpoint,
  sendMessage
} from './test-utils';

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await mockOpenRouter(page);
  });

  test.afterEach(async ({ page }) => {
    await page.contents.deleteDirectory('.pi');
  });

  test('should ask for a model provider, then answer', async ({ page }) => {
    const requests = await mockModel(page, ['Hello from the model.']);
    const chat = await createChat(page);

    await sendMessage(chat, 'Hello pi');
    await expect(page.locator('.jp-Dialog-header')).toHaveText(
      'Add a Model Provider'
    );
    await saveEndpoint(page);

    const messages = chat.locator('.jp-chat-message');
    await expect(messages).toHaveCount(2);
    await expect(messages.last().locator('.jp-chat-message-header')).toHaveText(
      /Pi/
    );
    await expect(
      messages.last().locator('.jp-chat-rendered-message')
    ).toHaveText('Hello from the model.');
    expect(requests).toHaveLength(1);
    expect(requests[0].messages.at(-1)).toEqual({
      role: 'user',
      content: [{ type: 'text', text: 'Hello pi' }]
    });
  });

  test('should list the models of the provider', async ({ page }) => {
    const chat = await createChat(page);
    await runCommand(page, ADD_PROVIDER);
    await saveEndpoint(page, `${ENDPOINT.model}, other-model`);

    await chat.getByRole('button', { name: ENDPOINT.model }).click();
    for (const model of [ENDPOINT.model, 'other-model']) {
      await expect(
        page.getByRole('menuitem', { name: `${model} ${ENDPOINT.name}` })
      ).toBeVisible();
    }
  });

  test('should run a tool after an approval', async ({ page, tmpPath }) => {
    const path = `${tmpPath}/hello.txt`;
    const requests = await mockModel(page, [
      { tool: 'write', args: { path, content: 'Hello from pi\n' } },
      'I wrote the file.'
    ]);
    const chat = await createChat(page);
    await runCommand(page, ADD_PROVIDER);
    await saveEndpoint(page);

    await sendMessage(chat, 'Write a file');
    await chat.getByRole('button', { name: 'Allow', exact: true }).click();

    await expect(chat.locator('.jp-ai-tool-call-item-completed')).toContainText(
      'write'
    );
    await expect(chat.locator('.jp-chat-rendered-message').last()).toHaveText(
      'I wrote the file.'
    );
    expect(await page.contents.fileExists(path)).toBe(true);
    expect(requests[1].messages.at(-1)).toMatchObject({
      role: 'tool',
      content: `Successfully wrote to ${path}`
    });
  });

  test('should not run a rejected tool', async ({ page, tmpPath }) => {
    const path = `${tmpPath}/hello.txt`;
    const requests = await mockModel(page, [
      { tool: 'write', args: { path, content: 'Hello from pi\n' } }
    ]);
    const chat = await createChat(page);
    await runCommand(page, ADD_PROVIDER);
    await saveEndpoint(page);

    await sendMessage(chat, 'Write a file');
    await chat.getByRole('button', { name: 'Reject' }).click();

    await expect(chat.locator('.jp-ai-tool-call-item-failed')).toContainText(
      'Reject'
    );
    await expect(chat.getByRole('button', { name: 'Stop pi' })).toBeDisabled();
    expect(await page.contents.fileExists(path)).toBe(false);
    expect(requests).toHaveLength(1);
  });

  test('should show the session with /session', async ({ page }) => {
    const chat = await createChat(page);

    await chat.getByRole('combobox').pressSequentially('/session');
    await expect(
      page.getByRole('option', { name: 'Show the session info and stats' })
    ).toBeVisible();
    await chat.getByRole('button', { name: 'Send message' }).click();

    await expect(
      chat.locator('.jp-chat-rendered-message').last()
    ).toContainText('Messages: 0 from the user, 0 from pi, 0 tool calls');
  });
});
