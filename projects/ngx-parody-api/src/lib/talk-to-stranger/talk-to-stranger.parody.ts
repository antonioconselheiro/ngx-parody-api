import { Injectable } from '@angular/core';
import { kinds, NostrEvent } from 'nostr-tools';
import { finalize, Observable, Subject } from 'rxjs';
import { NostrPublicUser } from '../domain/nostr-public-user.interface';
import { NostrPool } from '../nostr/nostr.pool';
import { NostrEventFactory } from './nostr-event.factory';
import { TalkToStrangerSigner } from './talk-to-stranger.signer';
import { FindStrangerParody } from './find-stranger.parody';
import { debuglog } from '../log/debuglog.fn';

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

  listenCurrenOnlineUsers(filterTags: string[] = ['omegle']): Observable<number> {
    const subject = new Subject<number>();
    let requestPending = false;
    const closure = () => {
      if (requestPending) {
        return;
      }

      requestPending = true;
      const filter = {
        kinds: [kinds.UserStatuses],
        '#t': filterTags,
        since: Math.floor(Date.now() / 1000) - (24 * 60 * 60)
      };

      debuglog('user count requested using filter: ', filter);
      this.npool.query([filter])
        .then(events => {
          const users = new Set<string>();
          debuglog('count events', events);
          events.forEach(event => users.add(event.pubkey));
          const count = [...users].length;

          debuglog('active users counted: ', count);
          subject.next(count);
          requestPending = false;
        })
        .catch(e => {
          console.error(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'user count lauched error', e);
          requestPending = false;
          clearInterval(id);
        });
    };

    const id = setInterval(closure, this.updateUserCountTimeout);
    closure();

    return subject
      .asObservable()
      .pipe(finalize(() => clearInterval(id)));
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
