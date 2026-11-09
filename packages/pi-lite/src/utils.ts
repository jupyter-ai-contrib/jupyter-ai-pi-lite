/**
 * The message of an error, or the thrown value as text.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
