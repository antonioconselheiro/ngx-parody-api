import { Injectable } from '@angular/core';

/**
 * Internal service of the chat with stranger functionality, aims to
 * avoid attempts to connect with keys that are definitely abandoned
 */
@Injectable({
  providedIn: 'root'
})
export class TalkToStrangeSession {

  private pubkeySet = new Set<string>();

  constructor() {
    this.loadList();
  }
  
  private loadList() {
    try {
      const serialized = sessionStorage.getItem('talkToStrangeIgnoreList');
      if (serialized) {
        let ignoreList = JSON.parse(serialized);
        if (ignoreList instanceof Array) {
          this.pubkeySet = new Set(ignoreList);
        } else {
          sessionStorage.setItem('talkToStrangeIgnoreList', '[]');
        }
      }
    } catch {
      sessionStorage.setItem('talkToStrangeIgnoreList', '[]');
    }
  }

  saveInList(pubkey: string): void {
    this.pubkeySet.add(pubkey);
    sessionStorage.setItem('talkToStrangeIgnoreList', JSON.stringify([...this.pubkeySet]));
  }

  isInList(pubkey: string): boolean {
    return this.pubkeySet.has(pubkey);
  }
}
