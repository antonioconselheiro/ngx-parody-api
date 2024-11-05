import { Injectable } from "@angular/core";
import { NostrEvent } from "@nostrify/nostrify";
import { catchError, Subscription, throwError, timeout } from "rxjs";
import { NostrEventFactory } from "./nostr-event.factory";
import { NostrPool } from "../nostr/nostr.pool";
import { FindStrangeNostr } from "./find-strange.nostr";
import { TalkToStrangeConfig } from "./talk-to-strange.config";
import { TalkToStrangeSession } from "./talk-to-strange.session";
import { TalkToStrangeSigner } from "./talk-to-strange.signer";
import { NostrPublicUser } from "../domain/nostr-public-user.interface";
import { NostrConverter } from "../nostr/nostr.converter";
import { SearchStrangeOptions } from "./search-strange-options.interface";

/**
 * Find strange service omegle feature for nostr
 */
@Injectable({
  providedIn: 'root'
})
export class FindStrangeService {

  constructor(
    private nostrEventFactory: NostrEventFactory,
    private findStrangerNostr: FindStrangeNostr,
    private talkToStrangeSession: TalkToStrangeSession,
    private talkToStrangeSigner: TalkToStrangeSigner,
    private nostrConverter: NostrConverter,
    private config: TalkToStrangeConfig,
    private npool: NostrPool
  ) { }

  publish(event: NostrEvent): Promise<void> {
    return this.npool.event(event);
  }

  async searchStranger(opts: SearchStrangeOptions): Promise<NostrPublicUser> {
    const wannaChat = await this.findStrangerNostr.queryChatAvailable(opts);
    const powComplexity = opts.powComplexity || false;
    if (wannaChat) {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'inviting ', wannaChat.pubkey, ' to chat and listening confirmation');
      const listening = this.listenChatingConfirmation(wannaChat, opts);
      await this.inviteToChating(wannaChat, powComplexity);
      const isChatingConfirmation = await listening;
      this.talkToStrangeSession.saveInList(wannaChat.pubkey);

      if (isChatingConfirmation) {
        return Promise.resolve(this.nostrConverter.convertPubkeyToPublicKeys(wannaChat.pubkey));
      } else {
        await this.endSession();
        return this.searchStranger(opts);
      }
    }

    const currentUser = await this.talkToStrangeSigner.getPublicUser();
    await this.publishWannaChatStatus(powComplexity);
    return new Promise(resolve => {
      const sub = this.findStrangerNostr
        .listenWannachatResponse(currentUser, opts)
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
            this.talkToStrangeSession.saveInList(event.pubkey);
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

  async replyChatInvitation(event: NostrEvent): Promise<NostrPublicUser | void> {
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'event was listen: ', event);
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'it must be a chating invitation from ', event.pubkey, ', repling invitation...');

    await this.inviteToChating(event);
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

  private inviteToChating(strangeStatus: NostrEvent, powComplexity: number | false = false): Promise<NostrEvent> {
    const stranger = this.nostrConverter.convertPubkeyToPublicKeys(strangeStatus.pubkey);
    return this.publishChatInviteStatus(stranger, powComplexity);
  }

  private async listenChatingConfirmation(strangerWannachatEvent: NostrEvent, opts: { signal?: AbortSignal }): Promise<boolean> {
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

  private async receiveChatingConfirmation(sub: Subscription, status: NostrEvent, strangerWannachatEvent: NostrEvent): Promise<boolean | undefined> {
    if (status.id === strangerWannachatEvent.id && status.content === 'wannachat') {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'stranger #wannachat status was listen, ignoring and waiting new status...');
      return Promise.resolve(undefined);
    }

    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', `stranger #${status.content} status was listen.`);
    sub.unsubscribe();
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', '[listenUserStatusUpdate] unsubscribe');
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'stranger ', strangerWannachatEvent.pubkey, ' update status: ', status);

    const me = await this.talkToStrangeSigner.getPublicUser();
    if (this.isChatingToPubKey(status, me)) {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'is "chating" status confirmed, resolved with true');
      return Promise.resolve(true);
    } else {
      console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'unexpected status was given, resolved with false, event: ', status);
      return Promise.resolve(false);
    }
  }

  private async publishWannaChatStatus(powComplexity: number | false = false): Promise<NostrEvent> {
    const wannaChatStatus = await this.nostrEventFactory.createWannaChatUserStatus(powComplexity);
    console.info(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', 'updating my status to: ', wannaChatStatus);
    await this.npool.event(wannaChatStatus);

    return Promise.resolve(wannaChatStatus);
  }

  private async publishChatInviteStatus(stranger: NostrPublicUser, powComplexity: number | false = false): Promise<NostrEvent> {
    const chatingStatus = await this.nostrEventFactory.createChatingUserStatus(stranger, powComplexity);
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
    const session = await this.talkToStrangeSigner.recreateSession();
    this.talkToStrangeSession.saveInList(session.pubkey);
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
