import { Injectable } from "@angular/core";
import { decode, npubEncode, NPub } from 'nostr-tools/nip19';
import { NostrPublicUser } from "../domain/nostr-public-user.interface";

@Injectable({
  providedIn: 'root'
})
export class NostrConverter {

  convertPubkeyToPublicKeys(pubkey: string): NostrPublicUser {
    const npub = npubEncode(pubkey);
    const publicUser: NostrPublicUser = { pubkey, npub };

    return publicUser;
  }
  
  convertNPubToPubkey(npub: NPub): string {
    const { data } = decode(npub);
    return data;
  }
}