import { Injectable } from '@angular/core';
import { NostrEvent } from '@nostrify/nostrify';
import { kinds } from 'nostr-tools';
import { Observable } from 'rxjs';
import { NostrPublicUser } from '../domain/nostr-public-user.interface';
import { TalkToStrangeSession } from './talk-to-strange.session';
import { NostrPool } from '../nostr/nostr.pool';

@Injectable()
export class FindStrangerNostr {

  constructor(
    private npool: NostrPool,
    private talkToStrangeSession: TalkToStrangeSession
  ) { }

  listenUserStatusUpdate(pubkey: string, opts: { signal?: AbortSignal }): Observable<NostrEvent> {
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'observing filter:', [
      {
        kinds: [ kinds.UserStatuses ],
        authors: [ pubkey ]
      }
    ]);
    return this.npool.observe([
      {
        kinds: [ kinds.UserStatuses ],
        authors: [ pubkey ]
      }
    ], opts);
  }

  queryWannachatResponse(user: NostrPublicUser, opts: { signal?: AbortSignal }): Promise<NostrEvent[]> {
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']','quering filter:', [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'chating', 'omegle' ],
        '#p': [ user.pubkey ],
        limit: 1
      }
    ]);
    return this.npool.query([
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'chating', 'omegle' ],
        '#p': [ user.pubkey ],
        limit: 1
      }
    ], opts);
  }

  listenWannachatResponse(user: NostrPublicUser, opts: { signal?: AbortSignal }): Observable<NostrEvent> {
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']','observing filter:', [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'chating', 'omegle' ],
        '#p': [ user.pubkey ],
        limit: 1
      }
    ]);
    return this.npool.observe([
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'chating', 'omegle' ],
        '#p': [ user.pubkey ],
        limit: 1
      }
    ], opts);
  }

  async queryChatAvailable(opts: { signal?: AbortSignal }): Promise<NostrEvent | null> {
    const currentTimeInSeconds = Math.floor(new Date().getTime() / 1_000);
    const timeInSeconds = (60 * 10);

    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'quering filter: ', [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'wannachat', 'omegle' ],
        since: currentTimeInSeconds - timeInSeconds
      }
    ]);
    let wannachats = await this.npool.query([
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'wannachat', 'omegle' ],
        since: currentTimeInSeconds - timeInSeconds
      }
    ], opts);

    wannachats = wannachats.filter(wannachat => !this.talkToStrangeSession.isInList(wannachat.pubkey));
    const wannachat = wannachats[Math.floor(Math.random() * wannachats.length)];

    if (wannachat) {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']','wanna chat found:', wannachat);
    } else {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']','wanna chat NOT found...');
    }

    return Promise.resolve(wannachat || null);
  }
}
