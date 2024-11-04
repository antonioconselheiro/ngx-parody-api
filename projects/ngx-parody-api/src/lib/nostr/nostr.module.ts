import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NostrEventFactory } from './nostr-event.factory';
import { NostrPool } from './nostr.pool';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    NostrEventFactory,
    NostrPool
  ]
})
export class NostrModule { }
