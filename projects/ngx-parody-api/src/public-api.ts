import { WindowNostr } from 'nostr-tools/nip07';

export * from './lib/injection-token/npool-options.token';
export * from './lib/domain/nostr-public-user.interface';
export * from './lib/talk-to-strange/talk-to-strange.module';
export * from './lib/talk-to-strange/find-strange.nostr';
export * from './lib/talk-to-strange/find-strange.service';
export * from './lib/talk-to-strange/talk-to-strange.config';
export * from './lib/talk-to-strange/talk-to-strange.nostr';
export * from './lib/talk-to-strange/nostr-event.factory';
export * from './lib/talk-to-strange/talk-to-strange.signer';
export * from './lib/talk-to-strange/talk-to-strange.session';
export * from './lib/nostr/nostr.module';
export * from './lib/nostr/nostr.converter';
export * from './lib/nostr/nostr.pool';

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}
