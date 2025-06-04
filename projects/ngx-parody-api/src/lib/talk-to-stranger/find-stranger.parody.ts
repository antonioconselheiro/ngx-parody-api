import { Injectable } from "@angular/core";
import { NostrEvent } from "@nostrify/nostrify";
import { catchError, Subscription, throwError, timeout } from "rxjs";
import { NostrPublicUser } from "../domain/nostr-public-user.interface";
import { log } from "../util/log";
import { NostrConverter } from "../nostr/nostr.converter";
import { NostrPool } from "../nostr/nostr.pool";
import { FindStrangerNostr } from "./find-stranger.nostr";
import { IgnoreListService } from "./ignore-list.service";
import { NostrEventFactory } from "./nostr-event.factory";
import { SearchStrangerOptions } from "./search-stranger-options.interface";
import { TalkToStrangerConfig } from "./talk-to-stranger.config";
import { TalkToStrangerSigner } from "./talk-to-stranger.signer";

/**
 * Find stranger service omegle feature for nostr
 */
@Injectable({
  providedIn: 'root'
})
export class FindStrangerParody {

  constructor(
    private factory: NostrEventFactory,
    private findStranger: FindStrangerNostr,
    private ignoreList: IgnoreListService,
    private signer: TalkToStrangerSigner,
    private converter: NostrConverter,
    private config: TalkToStrangerConfig,
    private npool: NostrPool
  ) { }

  /**
   * Publish event using nostr pool
   */
  publish(event: NostrEvent): Promise<NostrEvent> {
    return this.npool.publish(event);
  }

  /**
   * Search for stranger
   */
  async searchStranger(opts: SearchStrangerOptions, session?: NostrPublicUser): Promise<NostrPublicUser> {
    if (opts.signal && opts.signal.aborted) {
      await this.endSession();
      return Promise.reject(opts.signal);
    }

    if (!session) {
      session = this.createSession();
    }

    const wannaChat = await this.findStranger.queryChatAvailable(opts);

    if (wannaChat) {
      log.debug('inviting ', wannaChat.pubkey, ' to chat and listening confirmation');
      const listening = this.listenChatingConfirmation(wannaChat, opts);
      await this.inviteToChating(wannaChat);
      const isChatingConfirmation = await listening;
      this.ignoreList.saveInIgnoreList(wannaChat.pubkey);

      if (isChatingConfirmation) {
        return Promise.resolve(this.converter.convertPubkeyToPublicKeys(wannaChat.pubkey));
      } else {
        return this.searchStranger(opts, session);
      }
    }

    const currentUser = await this.signer.getPublicUser();
    await this.publishWannaChatStatus(opts);
    return new Promise(resolve => {
      const sub = this.findStranger
        .listenChatConfirmation(currentUser, opts)
        .pipe(
          timeout(this.config.wannachatStatusDefaultTimeoutInSeconds * 1000),
          catchError(err => {
            sub.unsubscribe();
            this.deleteUserHistory().then(
              () => this.searchStranger(opts).then(stranger => resolve(stranger))
            );

            return throwError(() => new err)
          })
        )
        .subscribe({
          next: event => {
            if (event.content === 'confirm') {
              this.ignoreList.saveInIgnoreList(event.pubkey);
              this.replyChatInvitation(event)
                .then(user => {
                  if (!user) {
                    throw new Error('app error: user not found');
                  }
  
                  resolve(user)
                })
                .catch(e => {
                  log.error(e);
                  throw e;
                });
  
              sub.unsubscribe();
            }
          },
          error: err => log.error(err)
        });
    });
  }

  private async replyChatInvitation(event: NostrEvent): Promise<NostrPublicUser | void> {
    log.debug('event was listen: ', event);
    log.debug('it must be a chating invitation from ', event.pubkey, ', repling invitation...');

    await this.inviteToChating(event);
    log.debug('replied... resolving... ');
    log.debug('[searchStranger] unsubscribe');
    return Promise.resolve(this.converter.convertPubkeyToPublicKeys(event.pubkey));
  }

  private isChatingToPubKey(event: NostrEvent, me: NostrPublicUser): boolean {
    log.debug('is wannachat reply with confirm? event: ', event);
    const result = event.content === 'confirm' && event.tags
      .filter(([type]) => type === 'p')
      .find(([, pubkey]) => pubkey === me.pubkey) || [];

    log.debug('is wannachat reply with confirm?', !!result.length ? 'yes' : 'no');
    return !!result.length;
  }

  private inviteToChating(strangerStatus: NostrEvent): Promise<NostrEvent> {
    const stranger = this.converter.convertPubkeyToPublicKeys(strangerStatus.pubkey);
    return this.publishChatInviteStatus(stranger);
  }

  private async listenChatingConfirmation(strangerWannachatEvent: NostrEvent, opts: SearchStrangerOptions): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      log.debug('listening status update from: ', strangerWannachatEvent.pubkey);
      // FIXME: ensure that the error will make the unsubscription trigger the abort signal sending, to clean filters in relay
      const subscription: Subscription = this.findStranger
        .listenUserStatusUpdate(strangerWannachatEvent.pubkey, opts)
        .subscribe({
          next: status => this.receiveChatingConfirmation(subscription, status, strangerWannachatEvent).then(is => {
            if (typeof is === 'boolean') {
              resolve(is);
            }
          }),
          error: (e) => {
            log.error(e);
            resolve(false);
          }
        });
    });
  }

  private async receiveChatingConfirmation(
    sub: Subscription,
    status: NostrEvent,
    strangerWannachatEvent: NostrEvent
  ): Promise<boolean | undefined> {
    if (sub.closed) {
      return Promise.resolve(void(0));
    }
    
    log.debug(`stranger status "${status.content}" was listen.`);
    log.debug('stranger ', strangerWannachatEvent.pubkey, ' update status: ', status);

    const me = await this.signer.getPublicUser();
    if (this.isChatingToPubKey(status, me)) {
      log.debug('is "confirm" status confirming chating, resolved with true');
      sub.unsubscribe();
      log.debug('[listenUserStatusUpdate] unsubscribe');

      return Promise.resolve(true);
    } else {
      log.debug('stranger is talking to another, resolved with false, event: ', status);
      return Promise.resolve(false);
    }
  }

  private publishWannaChatStatus(opts: SearchStrangerOptions): Promise<NostrEvent> {
    return this.npool.publishEfemeral(() => this.factory.createWannaChatUserStatus(opts));
  }

  private async publishChatInviteStatus(stranger: NostrPublicUser): Promise<NostrEvent> {
    return this.npool.publishEfemeral(() => this.factory.createChatingUserStatus(stranger));
  }

  private async deleteUserHistory(): Promise<void> {
    log.debug('deleting user history');
    await this.npool.publishEfemeral(() => this.factory.deleteUserHistory());
  }

  createSession(): NostrPublicUser {
    const session = this.signer.recreateSession();
    this.ignoreList.saveInIgnoreList(session.pubkey);
    log.debug('me: ', session.pubkey);
    return session;
  }

  async endSession(): Promise<NostrEvent> {
    await this.deleteUserHistory();
    return this.npool.publishEfemeral(() => this.factory.createDisconnectedUserStatus());
  }
}
