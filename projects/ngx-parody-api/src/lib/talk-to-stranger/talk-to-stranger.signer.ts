import { Injectable } from "@angular/core";
import { NostrEvent, NostrSigner, NSecSigner } from "@nostrify/nostrify";
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { npubEncode } from 'nostr-tools/nip19';
import { BehaviorSubject, Observable } from "rxjs";
import { NostrPublicUser } from "../domain/nostr-public-user.interface";

/**
 * This is a in-memory signer exclusive to talk to stranger algorithms,
 * this signer contain the current user session as stranger, the
 * recreateSession() method will clean the current session and generate
 * a new npub.
 * 
 * You don't need recreate session manually, when FindStrangerParody#searchStranger
 * is called the session is reacreated automatically, but you can use this service
 * to get current session pubkey and npub.
 */
@Injectable({
  providedIn: 'root'
})
export class TalkToStrangerSigner implements NostrSigner {

  #signer: NSecSigner;
  private currentSession: BehaviorSubject<NostrPublicUser>;

  constructor() {
    const secret = generateSecretKey();
    this.#signer = new NSecSigner(secret);
    const pubkey = getPublicKey(secret);
    const user: NostrPublicUser = {
      pubkey,
      npub: npubEncode(pubkey)
    };

    this.currentSession = new BehaviorSubject<NostrPublicUser>(user);
  }

  /**
   * method will clean the current session and generate a new pub
   */
  recreateSession(): NostrPublicUser {
    const secret = generateSecretKey();
    this.#signer = new NSecSigner(secret);
    const pubkey = getPublicKey(secret);
    const user: NostrPublicUser = {
      pubkey,
      npub: npubEncode(pubkey)
    };

    this.currentSession.next(user);
    return user;
  }

  /**
   * current session pubkey 
   */
  getPublicKey(): Promise<string> {
    return this.#signer.getPublicKey();
  }

  /**
   * current session pubkey and npub 
   */
  async getPublicUser(): Promise<NostrPublicUser> {
    const pubkey = await this.#signer.getPublicKey();
    return {
      pubkey,
      npub: npubEncode(pubkey)
    }
  }

  /**
   * subscription that listen the current user pubkey and npub
   */
  listenCurrentUser(): Observable<NostrPublicUser> {
    return this.currentSession.asObservable();
  }

  signEvent(event: Omit<NostrEvent, "id" | "pubkey" | "sig">): Promise<NostrEvent> {
    return this.#signer.signEvent(event);
  }

  readonly nip04 = {
    encrypt: async (pubkey: string, plaintext: string): Promise<string> => {
      return this.#signer.nip04.encrypt(pubkey, plaintext);
    },

    decrypt: async (pubkey: string, ciphertext: string): Promise<string> => {
      return this.#signer.nip04.decrypt(pubkey, ciphertext);
    }
  };

  readonly nip44 = {

    encrypt: async (pubkey: string, plaintext: string): Promise<string> => {
      return this.#signer.nip44.encrypt(pubkey, plaintext);
    },

    decrypt: async (pubkey: string, ciphertext: string): Promise<string> => {
      return this.#signer.nip44.decrypt(pubkey, ciphertext);
    }
  };
}