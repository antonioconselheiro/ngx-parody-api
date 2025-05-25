import { Injectable } from '@angular/core';
import { NostrEvent } from '@nostrify/nostrify';
import { kinds } from 'nostr-tools';
import { Observable } from 'rxjs';
import { NostrPublicUser } from '../domain/nostr-public-user.interface';
import { NostrPool } from '../nostr/nostr.pool';
import { SearchStrangerOptions } from './search-stranger-options.interface';
import { IgnoreListService } from './ignore-list.service';

@Injectable()
export class FindStrangerNostr {

  constructor(
    private npool: NostrPool,
    private talkToStrangerSession: IgnoreListService
  ) { }

  listenUserStatusUpdate(pubkey: string, opts: { signal?: AbortSignal }): Observable<NostrEvent> {    
    const filters = [
      {
        kinds: [ kinds.UserStatuses ],
        authors: [ pubkey ]
      }
    ];

    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'observing filter:', filters);
    return this.npool.observe(filters, opts);
  }

  queryChatConfirmation(user: NostrPublicUser, opts: SearchStrangerOptions): Promise<NostrEvent[]> {
    const filters = [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'confirm', ...opts.searchTags ],
        '#p': [ user.pubkey ],
        limit: 1
      }
    ];

    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']','quering filter:', filters);
    return this.npool.query(filters, opts);
  }

  listenChatConfirmation(user: NostrPublicUser, opts: SearchStrangerOptions): Observable<NostrEvent> {
    const filters = [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'confirm', ...opts.searchTags ],
        '#p': [ user.pubkey ],
        limit: 1
      }
    ];

    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']','observing filter:', filters);
    return this.npool.observe(filters, opts);
  }

  async queryChatAvailable(opts: SearchStrangerOptions): Promise<NostrEvent | null> {
    const currentTimeInSeconds = Math.floor(new Date().getTime() / 1_000);
    const timeInSeconds = (60 * 10);
    const status = opts.statusName || 'wannachat';

    const filters = [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ status ].concat(opts.searchTags),
        since: currentTimeInSeconds - timeInSeconds
      }
    ];

    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'quering filter: ', filters);
    let wannachats = await this.npool.query(filters, opts);

    wannachats = wannachats.filter(wannachat => this.validateEvent(wannachat, opts.searchTags));
    const wannachat = wannachats[Math.floor(Math.random() * wannachats.length)];

    if (wannachat) {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'wanna chat found:', wannachat);
    } else {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'wanna chat NOT found...');
    }

    return Promise.resolve(wannachat || null);
  }

  validateEvent(wannachatEvent: NostrEvent, searchTags: Array<string>): boolean {
    const eventIsInIgnoreList = this.talkToStrangerSession.isInIgnoreList(wannachatEvent.pubkey);
    if (eventIsInIgnoreList) {
      return false;
    }

    if (searchTags.length) {
      //  FIXME: será que eu não deveria centralizar está lógica no tags helper do nostr-ngx? getHashtags(event): Array<string>
      const eventTags = wannachatEvent.tags
        .filter(([tagType]) => tagType === 't')
        .map(([,value]) => value);

      const hasAll = searchTags
        .every(tag => eventTags.includes(tag));

      if (!hasAll) {
        return false;
      }
    }

    return true;
  }
}
