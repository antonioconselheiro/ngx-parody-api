export interface SearchStrangerOptions {

  /**
   * Allow to abort the find strang process
   */
  signal?: AbortSignal;

  /**
   * Alphanumeric string that user is searching for. Omeglestr uses "omegle" to find omegle users.
   */
  searchFor: string;

  /**
   * Alphanumeric string that represent the user. Omeglestr publishes this as "omegle".
   */
  userIs: string;

  /**
   * Alphanumeric string that represent the meeting purpose. Omeglestr uses "wannachat", because it users want to chat
   * @default wannachat
   */
  statusName?: string;
}