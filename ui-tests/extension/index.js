/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { IPiProviderRegistry } from '@jupyter-ai/pi-lite';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

const PLUGIN_ID = 'pi-lite-test-provider:plugin';

/**
 * Give a custom provider to pi, as another extension does. No server listens
 * at its URL: the tests mock its requests. The provider is set up when its
 * setting is on, so that the other tests have no model.
 */
const plugin = {
  id: PLUGIN_ID,
  description: 'A model provider for the integration tests of pi',
  autoStart: true,
  requires: [IPiProviderRegistry, ISettingRegistry],
  activate: (app, registry, settingRegistry) => {
    const settings = settingRegistry.load(PLUGIN_ID);
    registry.newProvider({
      id: 'test-provider',
      name: 'Test Provider',
      api: 'openai-completions',
      baseUrl: 'http://localhost:11435/v1',
      resolveAuth: async () =>
        (await settings).get('enabled').composite ? {} : undefined,
      models: [{ id: 'custom-model' }]
    });
  }
};

export default plugin;
