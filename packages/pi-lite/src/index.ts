import { IPersonaSessionRegistry } from '@jupyter-ai/persona-manager';
import type { PersonaSessionRegistry } from '@jupyter-ai/persona-manager';
import { IChatTracker, type IChatPanel } from '@jupyter/chat';
import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { PageConfig } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IAgentSettings, IToolRegistry } from '@jupyter-ai/agent-lite';
import { IComponentsRendererFactory } from 'jupyter-chat-components';
import { IMcpManager } from 'jupyter-mcp-manager';
import { ISecretsManager, SecretsManager } from 'jupyter-secrets-manager';

import { PiAgent } from './agent';
// The chats that are already open get the persona at activation.
// eslint-disable-next-line jupyter/prefer-lazy-imports
import { attachPiChat } from './persona';
import { AGENT_PLUGIN_ID, IPiAgent } from './tokens';

namespace CommandIds {
  export const addProvider = '@jupyter-ai/pi-lite:add-provider';
  export const openAgentFolder = '@jupyter-ai/pi-lite:open-agent-folder';
}

const GO_TO_PATH = 'filebrowser:go-to-path';

/**
 * Sign a plugin with the secrets manager, which gives it the token of its
 * namespace. The manager throws when it is locked, for example by another
 * extension: pi then keeps its keys in the browser storage.
 */
function signed<T>(
  factory: (token: symbol | null) => JupyterFrontEndPlugin<T>
): JupyterFrontEndPlugin<T> {
  // With the manager disabled, a signature locks it for the next extensions.
  if (PageConfig.Extension.isDisabled('jupyter-secrets-manager:manager')) {
    return factory(null);
  }
  try {
    return SecretsManager.sign(AGENT_PLUGIN_ID, factory);
  } catch (error) {
    console.warn('pi: cannot use the secrets manager', error);
    return factory(null);
  }
}

/**
 * The pi agent, and the commands to add a model provider and to show the
 * agent folder.
 */
const agentPlugin = signed<IPiAgent>(token => ({
  id: AGENT_PLUGIN_ID,
  description: 'The pi coding agent',
  autoStart: true,
  provides: IPiAgent,
  optional: [
    IToolRegistry,
    IAgentSettings,
    IMcpManager,
    ICommandPalette,
    IDocumentManager,
    ITranslator,
    ISecretsManager,
    ISettingRegistry
  ],
  activate: (
    app: JupyterFrontEnd,
    toolRegistry: IToolRegistry | null,
    agentSettings: IAgentSettings | null,
    mcpManager: IMcpManager | null,
    palette: ICommandPalette | null,
    documentManager: IDocumentManager | null,
    translator: ITranslator | null,
    secretsManager: ISecretsManager | null,
    settingRegistry: ISettingRegistry | null
  ): IPiAgent => {
    const trans = (translator ?? nullTranslator).load('jupyter_ai_pi_lite');
    const agent = new PiAgent({
      app,
      toolRegistry: toolRegistry ?? undefined,
      agentSettings: agentSettings ?? undefined,
      mcpManager: mcpManager ?? undefined,
      documentManager: documentManager ?? undefined,
      translator: translator ?? undefined,
      secrets:
        secretsManager && token
          ? { manager: secretsManager, token, namespace: AGENT_PLUGIN_ID }
          : undefined,
      settingRegistry: settingRegistry ?? undefined
    });
    app.commands.addCommand(CommandIds.addProvider, {
      label: trans.__('Pi: Add a Model Provider'),
      caption: trans.__(
        'Add an API key, sign in with OpenRouter, or add an OpenAI-compatible endpoint'
      ),
      describedBy: { args: { type: 'object', properties: {} } },
      execute: async () => (await agent.load()).host.addProvider()
    });
    app.commands.addCommand(CommandIds.openAgentFolder, {
      label: trans.__('Pi: Open the Agent Folder'),
      caption: trans.__(
        'Show the settings, sessions, skills and extensions of pi in the file browser'
      ),
      describedBy: { args: { type: 'object', properties: {} } },
      isEnabled: () => app.commands.hasCommand(GO_TO_PATH),
      execute: async () => {
        const path = await (await agent.load()).host.createAgentFolder();
        await app.commands.execute(GO_TO_PATH, { path });
      }
    });
    for (const command of [
      CommandIds.addProvider,
      CommandIds.openAgentFolder
    ]) {
      palette?.addItem({ command, category: trans.__('Pi') });
    }
    return agent;
  }
}));

/**
 * pi as a persona of the chats, next to Jupyternaut.
 */
const personaPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-ai/pi-lite:persona',
  description: 'Add pi to the personas of the chats',
  autoStart: true,
  requires: [IPiAgent],
  optional: [
    IChatTracker,
    IPersonaSessionRegistry,
    IComponentsRendererFactory,
    ITranslator
  ],
  activate: (
    app: JupyterFrontEnd,
    agent: IPiAgent,
    chatTracker: IChatTracker | null,
    registry: PersonaSessionRegistry | null,
    componentsFactory: IComponentsRendererFactory | null,
    translator: ITranslator | null
  ): void => {
    if (!chatTracker || !registry || !(agent instanceof PiAgent)) {
      return;
    }
    const trans = (translator ?? nullTranslator).load('jupyter_ai_pi_lite');
    const attach = (panel: IChatPanel) =>
      attachPiChat(panel, agent, registry, { shell: app.shell, trans });
    chatTracker.forEach(attach);
    chatTracker.widgetAdded.connect((sender, panel) => attach(panel));

    componentsFactory?.addCallbacks({
      toolCallPermissionDecision: (targetId, toolCallId, optionId) => {
        agent.loadedRuntime?.decideApproval(targetId, toolCallId, optionId);
      }
    });
  }
};

export default [agentPlugin, personaPlugin];

export { IPiAgent } from './tokens';
