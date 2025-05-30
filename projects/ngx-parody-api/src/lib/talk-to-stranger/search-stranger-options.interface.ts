export interface SearchStrangerOptions {

  /**
   * Allow to abort the find strang process
   */
  signal?: AbortSignal;

  /**
   * The algorithm will require the event status have these configured tags.
   * Omeglestr uses "omegle" to find omegle users.
   */
  searchFor: string;

  /**
   * Will publish user status with these configured tags.
   * In omeglestr is configured as "omegle" to be available for omegle strangers.
   */
  userIs: string;
}