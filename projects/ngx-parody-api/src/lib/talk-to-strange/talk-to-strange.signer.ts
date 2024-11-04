import { Injectable } from "@angular/core";
import { NostrEvent, NostrSigner, NSecSigner } from "@nostrify/nostrify";
import { generateSecretKey } from 'nostr-tools';
import { NostrPublicUser } from "../domain/nostr-public-user.interface";
import { npubEncode } from 'nostr-tools/nip19';

@Injectable({
  providedIn: 'root'
})
export class TalkToStrangeSigner implements NostrSigner {

  #signer: NSecSigner;

  constructor() {
    this.#signer = new NSecSigner(generateSecretKey());
  }

  recreateSession(): Promise<NostrPublicUser>  {
    this.#signer = new NSecSigner(generateSecretKey());
    return this.getPublicUser();
  }

  getPublicKey(): Promise<string> {
    return this.#signer.getPublicKey();
  }

  async getPublicUser(): Promise<NostrPublicUser> {
    const pubkey = await this.#signer.getPublicKey();
    return {
      pubkey,
      npub: npubEncode(pubkey)
    }
  }

  signEvent(event: Omit<NostrEvent, "id" | "pubkey" | "sig">): Promise<NostrEvent> {
    return this.#signer.signEvent(event);
  }
}