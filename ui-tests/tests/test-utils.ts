/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, IJupyterLabPageFixture } from '@jupyterlab/galata';
import { Locator } from '@playwright/test';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

/**
 * The OpenAI-compatible endpoint of the tests. No server listens there: the
 * tests mock its requests.
 */
export const ENDPOINT = {
  name: 'mock',
  baseUrl: 'http://localhost:11434/v1',
  model: 'test-model'
};

/**
 * The provider that the test extension gives to pi (see `../extension`), and
 * the settings that set it up. The tests mock its requests too.
 */
export const CUSTOM_PROVIDER = {
  id: 'test-provider',
  baseUrl: 'http://localhost:11435/v1',
  model: 'custom-model',
  settings: { 'pi-lite-test-provider:plugin': { enabled: true } }
};

/**
 * The name of a new chat.
 */
export const CHAT_NAME = 'untitled.chat';

/**
 * The label of the command that opens the provider dialog.
 */
export const ADD_PROVIDER = 'Pi: Add a Model Provider';

/**
 * A reply of the mocked model: a text, or a call of a tool.
 */
export type Reply = string | { tool: string; args: Record<string, unknown> };

/**
 * The body of a request to the mocked model.
 */
export interface IModelRequest {
  model: string;
  messages: { role: string; content: unknown }[];
}

/**
 * A reply as a stream of the OpenAI chat completions API.
 */
function stream(reply: Reply): string {
  const isText = typeof reply === 'string';
  const delta = isText
    ? { content: reply }
    : {
        tool_calls: [
          {
            index: 0,
            id: 'call_1',
            type: 'function',
            function: {
              name: reply.tool,
              arguments: JSON.stringify(reply.args)
            }
          }
        ]
      };
  const chunks = [
    { choices: [{ index: 0, delta: { role: 'assistant', ...delta } }] },
    {
      choices: [
        { index: 0, delta: {}, finish_reason: isText ? 'stop' : 'tool_calls' }
      ]
    }
  ];
  return [...chunks.map(chunk => JSON.stringify(chunk)), '[DONE]']
    .map(data => `data: ${data}\n\n`)
    .join('');
}

/**
 * Keep the tests off the network: pi lists the OpenRouter models when it
 * loads.
 */
export async function mockOpenRouter(
  page: IJupyterLabPageFixture
): Promise<void> {
  await page.route(OPENROUTER_MODELS_URL, route =>
    route.fulfill({ json: { data: [] } })
  );
}

/**
 * Mock the model of a provider (default: the endpoint): each request gets the
 * next reply. Returns the requests that the model received.
 */
export async function mockModel(
  page: IJupyterLabPageFixture,
  replies: Reply[],
  baseUrl = ENDPOINT.baseUrl
): Promise<IModelRequest[]> {
  const requests: IModelRequest[] = [];
  await page.route(`${baseUrl}/chat/completions`, route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      contentType: 'text/event-stream',
      body: stream(replies.shift() ?? '')
    });
  });
  return requests;
}

/**
 * Run a command from the command palette.
 */
export async function runCommand(
  page: IJupyterLabPageFixture,
  label: string
): Promise<void> {
  await page.keyboard.press('Control+Shift+C');
  const palette = page.locator('#command-palette');
  await palette.getByRole('textbox').fill(label);
  await palette.getByRole('menuitem', { name: label }).click();
}

/**
 * Fill the provider dialog, which must be open, with the endpoint of the
 * tests, save it, and close the notification.
 */
export async function saveEndpoint(
  page: IJupyterLabPageFixture,
  models = ENDPOINT.model
): Promise<void> {
  const dialog = page.locator('.jp-Dialog');
  await dialog
    .getByLabel('Provider')
    .selectOption({ label: 'OpenAI-compatible endpoint' });
  await dialog.getByLabel('Name').fill(ENDPOINT.name);
  await dialog.getByLabel('Base URL').fill(ENDPOINT.baseUrl);
  await dialog.getByLabel('Model ids, separated by commas').fill(models);
  await dialog.getByRole('button', { name: 'Save' }).click();
  const notification = page.locator('.Toastify__toast', {
    hasText: `Added the ${ENDPOINT.name} models to pi.`
  });
  await expect(notification).toBeVisible();
  // The notification covers the send button of the chat.
  await notification.getByTitle('Hide notification').click();
  await expect(notification).toBeHidden();
}

/**
 * Create a chat in the main area, and wait for its pi session. Returns the
 * panel of the chat.
 */
export async function createChat(
  page: IJupyterLabPageFixture
): Promise<Locator> {
  await page.menu.clickMenuItem('File>New>Chat');
  await page.activity.getTabLocator(CHAT_NAME).waitFor();
  const chat = (await page.activity.getPanelLocator(CHAT_NAME))!;
  await expect(chat.getByTitle('Choose which persona to message')).toHaveText(
    'Pi'
  );
  // The persona shows the token usage when its session is ready.
  await expect(chat.getByTitle('Session tokens: 0')).toBeVisible();
  return chat;
}

/**
 * Type a message in the input of a chat, and send it.
 */
export async function sendMessage(chat: Locator, text: string): Promise<void> {
  await chat.getByRole('combobox').pressSequentially(text);
  await chat.getByRole('button', { name: 'Send message' }).click();
}
