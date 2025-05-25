import { Injectable } from '@angular/core';

/**
 * Internal service of the chat with stranger functionality, aims to
 * avoid attempts to connect with keys that are definitely abandoned
 */
@Injectable({
  providedIn: 'root'
})
export class IgnoreListService {

  private ignoreList = new Set<string>();

  constructor() {
    this.loadIgnoreList();
  }
  
  private loadIgnoreList() {
    try {
      const serialized = sessionStorage.getItem('talkToStrangerIgnoreList');
      if (serialized) {
        let ignoreList = JSON.parse(serialized);
        if (ignoreList instanceof Array) {
          this.ignoreList = new Set(ignoreList);
        } else {
          sessionStorage.setItem('talkToStrangerIgnoreList', '[]');
        }
      }
    } catch {
      sessionStorage.setItem('talkToStrangerIgnoreList', '[]');
    }
  }

  saveInIgnoreList(pubkey: string): void {
    this.ignoreList.add(pubkey);
    sessionStorage.setItem('talkToStrangerIgnoreList', JSON.stringify([...this.ignoreList]));
  }

  isInIgnoreList(pubkey: string): boolean {
    return this.ignoreList.has(pubkey);
  }
}
