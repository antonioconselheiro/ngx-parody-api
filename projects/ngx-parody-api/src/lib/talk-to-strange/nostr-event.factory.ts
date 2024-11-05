import { Injectable } from '@angular/core';
import { NostrEvent } from '@nostrify/nostrify';
import { EventTemplate, kinds, nip04 } from 'nostr-tools';
import { NostrPublicUser } from '../domain/nostr-public-user.interface';
import { TalkToStrangeConfig } from './talk-to-strange.config';
import { TalkToStrangeSigner } from './talk-to-strange.signer';

@Injectable({
  providedIn: 'root'
})
export class NostrEventFactory {

  readonly largeExpirationTime = 30 * 60;

  constructor(
    private talkToStrangeConfig: TalkToStrangeConfig,
    private talkToStrangeSigner: TalkToStrangeSigner
  ) { }

  private unixTimeNow(): number {
    const oneMillisecond = 1000;
    return Math.floor(Date.now() / oneMillisecond);
  }

  /**
   * @param expireIn time in seconds to expire, default to 20
   * @returns expiration timestamp
   */
  private getExpirationTimestamp(
    expireIn = this.talkToStrangeConfig.wannachatStatusDefaultTimeoutInSeconds
  ): string {
    const oneMillisecond = 1000;
    const expirationTimestamp = Math.floor(Date.now() / oneMillisecond) + expireIn;
    return String(expirationTimestamp);
  }

  /**
   * NIP 4
   * https://github.com/nostr-protocol/nips/blob/master/04.md
   * https://github.com/nbd-wtf/nostr-tools/blob/master/nip04.test.ts
   */
  async createEncryptedDirectMessage(stranger: NostrPublicUser, message: string): Promise<NostrEvent> {
    const encriptedMessage = await this.talkToStrangeSigner.nip04.encrypt(stranger.pubkey, message);

    const unsignedEvent: EventTemplate = {
      kind: kinds.EncryptedDirectMessage,
      content: encriptedMessage,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_at: this.unixTimeNow(),
      tags: [
        [ 'p', stranger.pubkey],
        [ 'expiration', this.getExpirationTimestamp(this.largeExpirationTime) ]
      ]
    };

    return this.talkToStrangeSigner.signEvent(unsignedEvent);
  }

  /**
   * NIP 38
   * https://github.com/nostr-protocol/nips/blob/master/38.md
   */
  createWannaChatUserStatus(includePow = false): Promise<NostrEvent> {
    const expireIn = this.talkToStrangeConfig.wannachatStatusDefaultTimeoutInSeconds + 5;
    return this.createUserStatus('wannachat', [
        [ 'expiration', this.getExpirationTimestamp(expireIn) ],
        [ 't', 'omegle' ],
        [ 't', 'wannachat' ]
      ], includePow);
  }

  createDisconnectedUserStatus(): Promise<NostrEvent> {
    return this.createUserStatus('disconnected', [
      [ 'expiration', this.getExpirationTimestamp() ]
    ]);
  }

  createTypingUserStatus(): Promise<NostrEvent> {
    return this.createUserStatus('typing', [
      [ 't', 'omegle' ],
      [ 'expiration', this.getExpirationTimestamp(this.largeExpirationTime) ]
    ]);
  }

  createChatingUserStatus(strange: NostrPublicUser, includePow = false): Promise<NostrEvent> {
    return this.createUserStatus('chating', [
      [ 'expiration', this.getExpirationTimestamp(this.largeExpirationTime) ],
      [ 'p', strange.pubkey ],
      [ 't', 'omegle' ],
      [ 't', 'chating' ]
    ], includePow);
  }

  deleteUserHistory(): Promise<NostrEvent> {
    const template: EventTemplate = {
      kind: kinds.EventDeletion,
      tags: [
        [ 'k', String(kinds.EncryptedDirectMessage) ],
        [ 'k', String(kinds.UserStatuses) ],
        [ 'expiration', this.getExpirationTimestamp() ]
      ],
      created_at: Math.floor(new Date().getTime() / 1000),
      content: ''
    }

    return this.talkToStrangeSigner.signEvent(template);
  }

  cleanUserStatus(): Promise<NostrEvent> {
    return this.createUserStatus('', [
      [ 'expiration', this.getExpirationTimestamp(this.largeExpirationTime) ],
      [ 't', 'omegle' ]
    ]);
  }

  private async createUserStatus(status: string, customTags?: string[][], includePow = false): Promise<NostrEvent> {
    const tags = [
      ['d', 'general'],
      ...(customTags || [])
    ];

    let eventTemplate: EventTemplate = {
      kind: kinds.UserStatuses,
      content: status,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_at: this.unixTimeNow(),
      tags
    };

    if (includePow) {
      const pubkey = await this.talkToStrangeSigner.getPublicKey()
      const { data: eventSigner } = await new Promise<{ data: EventTemplate }>(resolve => {
        const worker = new Worker(new URL('./workers/nostr-event-pow.worker', import.meta.url), { type: 'module' });
        worker.onmessage = ({ data }) => {
          resolve(data);
          worker.terminate();
        };

        worker.postMessage({
          event: { ...eventTemplate, pubkey },
          complexity: 11
        });
      });

      eventTemplate = eventSigner;
    }

    return this.talkToStrangeSigner.signEvent(eventTemplate);
  }
}
