import { Injectable } from '@angular/core';
import { kinds, NostrEvent } from 'nostr-tools';
import { finalize, Observable, Subject } from 'rxjs';
import { NostrPublicUser } from '../domain/nostr-public-user.interface';
import { NostrPool } from '../nostr/nostr.pool';
import { NostrEventFactory } from './nostr-event.factory';
import { TalkToStrangerSigner } from './talk-to-stranger.signer';
import { FindStrangerService } from './find-stranger.service';

/**
 * Talk to stranger service omegle feature for nostr
 */
@Injectable()
export class TalkToStrangerNostr {

  readonly updateUserCountTimeout = 1000 * 60 * 5;

  constructor(
    private nostrEventFactory: NostrEventFactory,
    private findStrangerService: FindStrangerService,
    private talkToStrangerSigner: TalkToStrangerSigner,
    private npool: NostrPool
  ) { }

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
            kinds: [ kinds.EncryptedDirectMessage ],
            authors: [ stranger.pubkey ],
            '#p': [ pubkey ]
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
        kinds: [ kinds.UserStatuses ],
        authors: [ stranger.pubkey ]
      }
    ]);

    observable.subscribe(event => {
      if (event.content === 'disconnected') {
        this.findStrangerService.endSession();
      }
    });

    return observable;
  }

  listenCurrenOnlineUsers(): Observable<number> {
    const subject = new Subject<number>();
    let requestPending = false;
    const closure = () => {
      if (requestPending) {
        return;
      }

      requestPending = true;
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'user count requested');
      this.npool.query([
        {
          kinds: [ kinds.UserStatuses ],
          '#t': [ 'omegle' ],
          since: Math.floor(Date.now() / 1000) - (24 * 60 * 60)
        }
      ])
      .then(events => {
        const users = new Set<string>();
        console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']','count events', events);
        events.forEach(event => users.add(event.pubkey));
        const count = [...users].length;

        console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'active users counted: ', count);
        subject.next(count);
        requestPending = false;
      })
      .catch(e => {
        console.error(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']','user count lauched error', e);
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

  async sendMessage(stranger: NostrPublicUser, message: string): Promise<void> {
    await this.stopTyping();
    const event = await this.nostrEventFactory.createEncryptedDirectMessage(stranger, message);
    return this.npool.event(event);
  }

  async isTyping(): Promise<void> {
    const wannaChatStatus = await this.nostrEventFactory.createTypingUserStatus();
    return this.npool.event(wannaChatStatus);
  }

  async stopTyping(): Promise<void> {
    const wannaChatStatus = await this.nostrEventFactory.cleanUserStatus();
    return this.npool.event(wannaChatStatus);
  }
}
