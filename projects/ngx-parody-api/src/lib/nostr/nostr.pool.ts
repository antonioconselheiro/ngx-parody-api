import { Inject, Injectable } from '@angular/core';
import { NostrEvent, NostrFilter, NPool, NPoolOpts, NRelay1 } from '@nostrify/nostrify';
import { finalize, Observable, Subject } from 'rxjs';
import { POOL_OPTIONS_TOKEN } from '../injection-token/npool-options.token';
import { log } from '../log/log';

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

  async publish(event: NostrEvent, opts?: {
    signal?: AbortSignal;
  }): Promise<NostrEvent> {
    await this.event(event, opts);
    return Promise.resolve(event);
  }

  /**
   * create new status event and republish if relay
   * strfry replies with "replaced: have newer event"
   */
  async publishEfemeral(factory: () => Promise<NostrEvent>, opts?: {
    signal?: AbortSignal;
  }): Promise<NostrEvent> {
    let event: NostrEvent;
    try {
      event = await factory();
      log.debug('updating status to: ', event);
      await this.event(event, opts);
    } catch (e) {
      const error = (e as any)?.errors[0] || e;  

      if (error instanceof Error && /^replaced\:/.test(error.message)) {
        console.warn('replaced error happen on trying to publish status... trying again...');
        //  replaced means that the last event was too new to override an existing status
        //  to create the event again will make it older
        event = await factory();
        log.debug('updating status to: ', event);
        await this.event(event, opts);
      } else {
        return Promise.reject(e);
      }
    }
    
    return Promise.resolve(event);
  }

  observe(filters: Array<NostrFilter>, opts?: { signal?: AbortSignal }): Observable<NostrEvent> {
    log.debug('[[subscribe filter]]', filters);
    const controller = new AbortController();
    const signal = opts?.signal ? AbortSignal.any([opts.signal, controller.signal]) : controller.signal;
    const subject = new Subject<NostrEvent>();
    const nset = new Map<string, NostrEvent>();

    (async () => {
      for await (const msg of this.req(filters, { signal })) {
        if (msg[0] === 'CLOSED') {
          subject.error(msg);
          break;
        } else if (msg[0] === 'EVENT') {
          const nsetSize = nset.size;
          nset.set(msg[2].id, msg[2]);

          if (nsetSize !== nset.size) {
            subject.next(msg[2]);
          } else {
            log.debug('event deduplicated, not emiting again: ', msg[2]);
            log.debug('current nset from request: ', nset);
          }
        }
      }
    })();

    return subject
      .asObservable()
      .pipe(
        finalize(() => {
          log.debug('[[unsubscribe filter]]', filters);
          setTimeout(() => controller.abort());
        })
      );
  }
}
