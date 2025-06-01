import { Inject, Injectable } from '@angular/core';
import { NostrEvent, NostrFilter, NPool, NPoolOpts, NRelay1 } from '@nostrify/nostrify';
import { finalize, Observable, Subject } from 'rxjs';
import { POOL_OPTIONS_TOKEN } from '../injection-token/npool-options.token';
import { debuglog } from '../log/debuglog.fn';

/**
 * when nostr-ngx get launched this class will be deprecated and
 * the equivalent pool from nostr-ngx project will replace it
 */
@Injectable()
export class NostrPool extends NPool<NRelay1> {

  constructor(
    @Inject(POOL_OPTIONS_TOKEN) poolOptions: NPoolOpts<NRelay1>
  ) {
    super(poolOptions);
  }

  observe(filters: Array<NostrFilter>, opts?: { signal?: AbortSignal, launchErrorOnClosed?: boolean }): Observable<NostrEvent> {
    debuglog('[[subscribe filter]]', filters);
    const controller = new AbortController();
    const signal = opts?.signal ? AbortSignal.any([opts.signal, controller.signal]) : controller.signal;
    const subject = new Subject<NostrEvent>();
    const nset = new Map<string, NostrEvent>();

    (async () => {
      for await (const msg of this.req(filters, { signal })) {
        if (msg[0] === 'CLOSED') {
          if (opts && opts.launchErrorOnClosed) {
            subject.error(msg)
          }
          break;
        } else if (msg[0] === 'EVENT') {
          const nsetSize = nset.size;
          nset.set(msg[2].id, msg[2]);

          if (nsetSize !== nset.size) {
            subject.next(msg[2]);
          } else {
            debuglog( 'event deduplicated, not emiting again: ', msg[2]);
            debuglog( 'current nset from request: ', nset);
          }
        }
      }
    })();
  
    return subject
      .asObservable()
      .pipe(
        finalize(() => {
          debuglog( '[[unsubscribe filter]]', filters);
          setTimeout(() => controller.abort());
        })
      );
  }
}
