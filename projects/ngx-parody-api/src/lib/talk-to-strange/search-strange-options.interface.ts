export interface SearchStrangeOptions {

  /**
   * Allow to abort the find strang process
   */
  signal?: AbortSignal;

  /**
   * Include proof of work (PoW) in the first event sent to relay
   * with a new npub, some relays can require this.
   * 
   * You must set the number of desired PoW complexity and it'll
   * be calculed in a webworker.
   * 
   * @default false
   */
  powComplexity?: number | false;

  /**
   * Status name and hashtag that will indicate you wanna find strangers.
   * Omeglestr set this as 'wannachat', but you can customize it like 'wannaplay'.
   * If you customize it you'll not find strangers from 'wannachat'.
   *
   * @default wannachat
   */
  statusName?: string;

  /**
   * The algorithm will require the event status have these configured tags.
   * Omeglestr uses ["omegle"] to find omegle users.
   */
  searchTags: Array<string>;

  /**
   * Will publish user status with these configured tags.
   * In omeglestr is configured as ["omegle"] to be available for omegle stranges.
   */
  userTags: Array<string>;
}