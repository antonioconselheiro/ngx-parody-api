import { WindowNostr } from 'nostr-tools/nip07';

export * from './lib/injection-token/npool-options.token';
export * from './lib/domain/nostr-public-user.interface';
export * from './lib/talk-to-stranger/talk-to-stranger.module';
export * from './lib/talk-to-stranger/find-stranger.nostr';
export * from './lib/talk-to-stranger/find-stranger.service';
export * from './lib/talk-to-stranger/talk-to-stranger.config';
export * from './lib/talk-to-stranger/talk-to-stranger.nostr';
export * from './lib/talk-to-stranger/nostr-event.factory';
export * from './lib/talk-to-stranger/talk-to-stranger.signer';
export * from './lib/talk-to-stranger/talk-to-stranger.session';
export * from './lib/nostr/nostr.module';
export * from './lib/nostr/nostr.converter';
export * from './lib/nostr/nostr.pool';
export * from './lib/workers/nostr-event-pow.worker';

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}
