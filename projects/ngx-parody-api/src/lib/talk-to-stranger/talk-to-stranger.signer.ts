import { Injectable } from "@angular/core";
import { NostrEvent, NostrSigner, NSecSigner } from "@nostrify/nostrify";
import { generateSecretKey } from 'nostr-tools';
import { NostrPublicUser } from "../domain/nostr-public-user.interface";
import { npubEncode } from 'nostr-tools/nip19';

@Injectable({
  providedIn: 'root'
})
export class TalkToStrangerSigner implements NostrSigner {

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