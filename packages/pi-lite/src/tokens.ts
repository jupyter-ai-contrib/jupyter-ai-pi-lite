import type { IExternalRunContext } from '@jupyterlite/cockle';
import { Token } from '@lumino/coreutils';

/**
 * The pi coding agent of the page, shared by the chat persona and the
 * terminal command.
 */
export interface IPiAgent {
  /**
   * Run pi's interactive mode in a JupyterLite terminal, as an external cockle
   * command. Resolves with the exit code.
   */
  runTerminal(context: IExternalRunContext): Promise<number>;

  /**
   * Stop the pi that runs in a terminal, when its terminal session shuts
   * down.
   */
  stopTerminal(shellId: string): void;
}

export const IPiAgent = new Token<IPiAgent>(
  '@jupyter-ai/pi-lite:IPiAgent',
  'The pi coding agent.'
);

/**
 * The plugin of the pi agent: also the namespace of its settings and of its
 * secrets.
 */
export const AGENT_PLUGIN_ID = '@jupyter-ai/pi-lite:agent';

/**
 * The chat user of the pi persona.
 */
export const PI_PERSONA_ID = 'pi-frontend';
