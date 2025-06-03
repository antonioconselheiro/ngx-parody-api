import { Injectable } from "@angular/core";
import { NostrEvent } from "@nostrify/nostrify";
import { catchError, Subscription, throwError, timeout } from "rxjs";
import { NostrPublicUser } from "../domain/nostr-public-user.interface";
import { debuglog } from "../log/debuglog.fn";
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
      debuglog('inviting ', wannaChat.pubkey, ' to chat and listening confirmation');
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
            this.ignoreList.saveInIgnoreList(event.pubkey);
            this.replyChatInvitation(event)
              .then(user => {
                if (!user) {
                  throw new Error('internal error: user not found, please report this with the logs from developer tools (F12)');
                }

                resolve(user)
              })
              .catch(e => {
                console.error(e);
                throw e;
              });

            sub.unsubscribe();
          },
          error: err => console.error(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']',err)
        });
    });
  }

  private async replyChatInvitation(event: NostrEvent): Promise<NostrPublicUser | void> {
    debuglog('event was listen: ', event);
    debuglog('it must be a chating invitation from ', event.pubkey, ', repling invitation...');

    await this.inviteToChating(event);
    debuglog('replied... resolving... ');
    debuglog('[searchStranger] unsubscribe');
    return Promise.resolve(this.converter.convertPubkeyToPublicKeys(event.pubkey));
  }

  private isChatingToPubKey(event: NostrEvent, me: NostrPublicUser): boolean {
    debuglog('is wannachat reply with confirm? event: ', event);
    const result = event.content === 'confirm' && event.tags
      .filter(([type]) => type === 'p')
      .find(([, pubkey]) => pubkey === me.pubkey) || [];

    debuglog('is wannachat reply with confirm?', !!result.length ? 'yes' : 'no');
    return !!result.length;
  }

  private inviteToChating(strangerStatus: NostrEvent): Promise<NostrEvent> {
    const stranger = this.converter.convertPubkeyToPublicKeys(strangerStatus.pubkey);
    return this.publishChatInviteStatus(stranger);
  }

  private async listenChatingConfirmation(strangerWannachatEvent: NostrEvent, opts: SearchStrangerOptions): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      debuglog('listening status update from: ', strangerWannachatEvent.pubkey);
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
            console.error(e);
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
    
    debuglog(`stranger status "${status.content}" was listen.`);
    debuglog('stranger ', strangerWannachatEvent.pubkey, ' update status: ', status);

    const me = await this.signer.getPublicUser();
    if (this.isChatingToPubKey(status, me)) {
      debuglog('is "confirm" status confirming chating, resolved with true');
      sub.unsubscribe();
      debuglog('[listenUserStatusUpdate] unsubscribe');

      return Promise.resolve(true);
    } else {
      debuglog('stranger is talking to another, resolved with false, event: ', status);
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
    debuglog('deleting user history');
    await this.npool.publishEfemeral(() => this.factory.deleteUserHistory());
  }

  createSession(): NostrPublicUser {
    const session = this.signer.recreateSession();
    this.ignoreList.saveInIgnoreList(session.pubkey);
    debuglog('me: ', session.pubkey);
    return session;
  }

  async endSession(): Promise<NostrEvent> {
    await this.deleteUserHistory();
    return this.npool.publishEfemeral(() => this.factory.createDisconnectedUserStatus());
  }
}
