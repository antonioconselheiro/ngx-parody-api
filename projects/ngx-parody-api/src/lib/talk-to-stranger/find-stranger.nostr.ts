import { Injectable } from '@angular/core';
import { NostrEvent } from '@nostrify/nostrify';
import { kinds } from 'nostr-tools';
import { Observable } from 'rxjs';
import { NostrPublicUser } from '../domain/nostr-public-user.interface';
import { NostrPool } from '../nostr/nostr.pool';
import { SearchStrangerOptions } from './search-stranger-options.interface';
import { IgnoreListService } from './ignore-list.service';
import { debuglog } from '../log/debuglog.fn';

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

    debuglog('observing filter:', filters);
    return this.npool.observe(filters, opts);
  }

  queryChatConfirmation(user: NostrPublicUser, opts: SearchStrangerOptions): Promise<NostrEvent[]> {
    const filters = [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'confirm' ],
        '#p': [ user.pubkey ],
        limit: 1
      }
    ];

    debuglog('quering filter:', filters);
    return this.npool.query(filters, opts);
  }

  listenChatConfirmation(user: NostrPublicUser, opts: SearchStrangerOptions): Observable<NostrEvent> {
    const filters = [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [ 'confirm' ],
        '#p': [ user.pubkey ],
        limit: 1
      }
    ];

    debuglog('observing filter:', filters);
    return this.npool.observe(filters, opts);
  }

  private generateSearchUserTags(opts: SearchStrangerOptions): string {
    return `${opts.searchFor}_wannachat_${opts.userIs}`;
  }

  async queryChatAvailable(opts: SearchStrangerOptions): Promise<NostrEvent | null> {
    const currentTimeInSeconds = Math.floor(new Date().getTime() / 1_000);
    const timeInSeconds = (60 * 10);
    const searchTag = this.generateSearchUserTags(opts);

    const filters = [
      {
        kinds: [ kinds.UserStatuses ],
        '#t': [searchTag],
        since: currentTimeInSeconds - timeInSeconds
      }
    ];

    debuglog('quering filter: ', filters);
    let wannachats = await this.npool.query(filters, opts);

    wannachats = wannachats.filter(wannachat => this.validateEvent(wannachat, opts));
    debuglog('list of wannachat event loaded:', wannachats);
    const wannachat = wannachats[Math.floor(Math.random() * wannachats.length)];

    if (wannachat) {
      debuglog('wannachat found:', wannachat);
    } else {
      debuglog('wannachat NOT found...');
    }

    return Promise.resolve(wannachat || null);
  }

  /**
   * Garante que o evento identificado tenha todas as tags requeridas
   * @returns 
   */
  validateEvent(wannachatEvent: NostrEvent, opts: SearchStrangerOptions): boolean {
    const eventIsInIgnoreList = this.talkToStrangerSession.isInIgnoreList(wannachatEvent.pubkey);
    if (eventIsInIgnoreList) {
      return false;
    }

    const searchTag = this.generateSearchUserTags(opts);
      //  FIXME: será que eu não deveria centralizar está lógica no tags helper do nostr-ngx? getHashtags(event): Array<string>
    const eventTags = wannachatEvent.tags
      .filter(([tagType]) => tagType === 't')
      .map(([,value]) => value);

    debuglog('required tags', searchTag, 'event tags:', eventTags);

    const hasAll = eventTags.includes(searchTag);

    if (!hasAll) {
      return false;
    }

    return true;
  }
}
