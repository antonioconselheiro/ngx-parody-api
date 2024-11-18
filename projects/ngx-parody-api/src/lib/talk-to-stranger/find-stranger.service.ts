import { Injectable } from "@angular/core";
import { NostrEvent } from "@nostrify/nostrify";
import { catchError, Subscription, throwError, timeout } from "rxjs";
import { NostrEventFactory } from "./nostr-event.factory";
import { NostrPool } from "../nostr/nostr.pool";
import { FindStrangerNostr } from "./find-stranger.nostr";
import { TalkToStrangerConfig } from "./talk-to-stranger.config";
import { TalkToStrangerSession } from "./talk-to-stranger.session";
import { TalkToStrangerSigner } from "./talk-to-stranger.signer";
import { NostrPublicUser } from "../domain/nostr-public-user.interface";
import { NostrConverter } from "../nostr/nostr.converter";
import { SearchStrangerOptions } from "./search-stranger-options.interface";

/**
 * Find stranger service omegle feature for nostr
 */
@Injectable({
  providedIn: 'root'
})
export class FindStrangerService {

  constructor(
    private nostrEventFactory: NostrEventFactory,
    private findStrangerNostr: FindStrangerNostr,
    private talkToStrangerSession: TalkToStrangerSession,
    private talkToStrangerSigner: TalkToStrangerSigner,
    private nostrConverter: NostrConverter,
    private config: TalkToStrangerConfig,
    private npool: NostrPool
  ) { }

  publish(event: NostrEvent): Promise<void> {
    return this.npool.event(event);
  }

  async searchStranger(opts: SearchStrangerOptions): Promise<NostrPublicUser> {
    await this.createSession();
    const wannaChat = await this.findStrangerNostr.queryChatAvailable(opts);

    if (wannaChat) {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'inviting ', wannaChat.pubkey, ' to chat and listening confirmation');
      const listening = this.listenChatingConfirmation(wannaChat, opts);
      await this.inviteToChating(wannaChat, opts);
      const isChatingConfirmation = await listening;
      this.talkToStrangerSession.saveInList(wannaChat.pubkey);

      if (isChatingConfirmation) {
        return Promise.resolve(this.nostrConverter.convertPubkeyToPublicKeys(wannaChat.pubkey));
      } else {
        await this.endSession();
        return this.searchStranger(opts);
      }
    }

    const currentUser = await this.talkToStrangerSigner.getPublicUser();
    await this.publishWannaChatStatus(opts);
    return new Promise(resolve => {
      const sub = this.findStrangerNostr
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
            this.talkToStrangerSession.saveInList(event.pubkey);
            this.replyChatInvitation(event, opts)
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

  async replyChatInvitation(event: NostrEvent, opts: SearchStrangerOptions): Promise<NostrPublicUser | void> {
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'event was listen: ', event);
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'it must be a chating invitation from ', event.pubkey, ', repling invitation...');

    await this.inviteToChating(event, opts);
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'replied... resolving... ');
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', '[searchStranger] unsubscribe');
    return Promise.resolve(this.nostrConverter.convertPubkeyToPublicKeys(event.pubkey));
  }

  private isChatingToPubKey(event: NostrEvent, me: NostrPublicUser): boolean {
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'is wannachat reply with chating? event: ', event);

    const result = event.tags
      .filter(([type]) => type === 'p')
      .find(([, pubkey]) => pubkey === me.pubkey) || [];

    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'is wannachat reply with chating?', !!result.length ? 'yes' : 'no');
    return !!result.length;
  }

  private inviteToChating(strangerStatus: NostrEvent, opts: SearchStrangerOptions): Promise<NostrEvent> {
    const stranger = this.nostrConverter.convertPubkeyToPublicKeys(strangerStatus.pubkey);
    return this.publishChatInviteStatus(stranger, opts);
  }

  private async listenChatingConfirmation(strangerWannachatEvent: NostrEvent, opts: SearchStrangerOptions): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'listening status update from: ', strangerWannachatEvent.pubkey);
      // FIXME: ensure that the error will make the unsubscription trigger the abort signal sending, to clean filters in relay
      const subscription: Subscription = this.findStrangerNostr
        .listenUserStatusUpdate(strangerWannachatEvent.pubkey, opts)
        .pipe(
          timeout(5000),
          catchError(err => throwError(() => new Error('chat confirmation timeout after 5s waiting, there is no stranger connected to this session', { cause: err })))
        )
        .subscribe({
          next: status => this.receiveChatingConfirmation(subscription, status, strangerWannachatEvent, opts).then(is => {
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

  private async receiveChatingConfirmation(sub: Subscription, status: NostrEvent, strangerWannachatEvent: NostrEvent, opts: SearchStrangerOptions): Promise<boolean | undefined> {
    const statusName = opts.statusName || 'wannachat';
    if (status.id === strangerWannachatEvent.id && status.content === statusName) {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'stranger #wannachat status was listen, ignoring and waiting new status...');
      return Promise.resolve(undefined);
    }

    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', `stranger #${status.content} status was listen.`);
    sub.unsubscribe();
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', '[listenUserStatusUpdate] unsubscribe');
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'stranger ', strangerWannachatEvent.pubkey, ' update status: ', status);

    const me = await this.talkToStrangerSigner.getPublicUser();
    if (this.isChatingToPubKey(status, me)) {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'is "confirm" status confirming chating, resolved with true');
      return Promise.resolve(true);
    } else {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'unexpected status was given, resolved with false, event: ', status);
      return Promise.resolve(false);
    }
  }

  private async publishWannaChatStatus(opts: SearchStrangerOptions): Promise<NostrEvent> {
    const wannaChatStatus = await this.nostrEventFactory.createWannaChatUserStatus(opts);
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'updating my status to: ', wannaChatStatus);
    await this.npool.event(wannaChatStatus);

    return Promise.resolve(wannaChatStatus);
  }

  private async publishChatInviteStatus(stranger: NostrPublicUser, opts: SearchStrangerOptions): Promise<NostrEvent> {
    const chatingStatus = await this.nostrEventFactory.createChatingUserStatus(stranger, opts);
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'updating my status to: ', chatingStatus);
    await this.npool.event(chatingStatus);

    return Promise.resolve(chatingStatus);
  }

  private async deleteUserHistory(): Promise<void> {
    const deleteStatus = await this.nostrEventFactory.deleteUserHistory();
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'deleting user history');
    await this.npool.event(deleteStatus);
  }

  async createSession(): Promise<NostrPublicUser> {
    const session = await this.talkToStrangerSigner.recreateSession();
    this.talkToStrangerSession.saveInList(session.pubkey);
    console.info(new Date().toLocaleString(), 'me: ', session.pubkey);
    return session;
  }

  async endSession(): Promise<NostrEvent> {
    const disconnectStatus = await this.nostrEventFactory.createDisconnectedUserStatus();
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'updating my status to: ', disconnectStatus);
    await this.deleteUserHistory();
    await this.npool.event(disconnectStatus);

    return Promise.resolve(disconnectStatus);
  }
}
