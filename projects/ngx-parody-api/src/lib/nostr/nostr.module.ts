import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NostrConverter } from './nostr.converter';
import { NostrPool } from './nostr.pool';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    NostrConverter,
    NostrPool
  ]
})
export class NostrModule { }
