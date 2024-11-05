import { Injectable } from '@angular/core';

/**
 * Internal service of the chat with stranger functionality, aims to
 * avoid attempts to connect with keys that are definitely abandoned
 */
@Injectable({
  providedIn: 'root'
})
export class TalkToStrangerSession {

  private pubkeySet = new Set<string>();

  constructor() {
    this.loadList();
  }
  
  private loadList() {
    try {
      const serialized = sessionStorage.getItem('talkToStrangerIgnoreList');
      if (serialized) {
        let ignoreList = JSON.parse(serialized);
        if (ignoreList instanceof Array) {
          this.pubkeySet = new Set(ignoreList);
        } else {
          sessionStorage.setItem('talkToStrangerIgnoreList', '[]');
        }
      }
    } catch {
      sessionStorage.setItem('talkToStrangerIgnoreList', '[]');
    }
  }

  saveInList(pubkey: string): void {
    this.pubkeySet.add(pubkey);
    sessionStorage.setItem('talkToStrangerIgnoreList', JSON.stringify([...this.pubkeySet]));
  }

  isInList(pubkey: string): boolean {
    return this.pubkeySet.has(pubkey);
  }
}
