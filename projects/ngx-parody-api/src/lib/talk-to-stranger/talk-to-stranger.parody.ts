import { Injectable } from '@angular/core';
import { kinds, NostrEvent } from 'nostr-tools';
import { Observable, Subject } from 'rxjs';
import { NostrPublicUser } from '../domain/nostr-public-user.interface';
import { NostrPool } from '../nostr/nostr.pool';
import { FindStrangerParody } from './find-stranger.parody';
import { NostrEventFactory } from './nostr-event.factory';
import { TalkToStrangerSigner } from './talk-to-stranger.signer';

/**
 * Talk to stranger service omegle feature for nostr
 */
@Injectable()
export class TalkToStrangerParody {

  readonly updateUserCountTimeout = 1000 * 60 * 5;

  constructor(
    private nostrEventFactory: NostrEventFactory,
    private findStrangerService: FindStrangerParody,
    private talkToStrangerSigner: TalkToStrangerSigner,
    private npool: NostrPool
  ) { }

  /**
   * current session pubkey 
   */
  getPublicKey(): Promise<string> {
    return this.talkToStrangerSigner.getPublicKey();
  }

  /**
   * current session pubkey and npub 
   */
  async getPublicUser(): Promise<NostrPublicUser> {
    return this.talkToStrangerSigner.getPublicUser();
  }

  /**
   * subscription that listen the current user pubkey and npub
   */
  listenCurrentUser(): Observable<NostrPublicUser> {
    return this.talkToStrangerSigner.listenCurrentUser();
  }

  async openEncryptedDirectMessage(stranger: NostrPublicUser, event: NostrEvent): Promise<string> {
    return this.talkToStrangerSigner.nip04.decrypt(stranger.pubkey, event.content);
  }

  listenMessages(stranger: NostrPublicUser): Observable<NostrEvent> {
    const subject = new Subject<NostrEvent>();
    this.talkToStrangerSigner
      .getPublicKey()
      .then(pubkey => {
        this.npool.observe([
          {
            kinds: [kinds.EncryptedDirectMessage],
            authors: [stranger.pubkey],
            '#p': [pubkey]
          }
        ]).subscribe({
          next: event => subject.next(event),
          error: error => subject.error(error),
          complete: () => subject.complete(),
        });
      });

    return subject.asObservable();
  }

  listenStrangerStatus(stranger: NostrPublicUser): Observable<NostrEvent> {
    const observable = this.npool.observe([
      {
        kinds: [kinds.UserStatuses],
        authors: [stranger.pubkey]
      }
    ]);

    observable.subscribe(event => {
      if (event.content === 'disconnected') {
        this.findStrangerService.endSession();
      }
    });

    return observable;
  }

  async sendMessage(stranger: NostrPublicUser, message: string): Promise<NostrEvent> {
    await this.stopTyping();
    const event = await this.nostrEventFactory.createEncryptedDirectMessage(stranger, message);
    return this.npool.publish(event);
  }

  isTyping(): Promise<NostrEvent> {
    return this.npool.publishEfemeral(() => this.nostrEventFactory.createTypingUserStatus());
  }

  stopTyping(): Promise<NostrEvent> {
    return this.npool.publishEfemeral(() => this.nostrEventFactory.cleanUserStatus());
  }
}
