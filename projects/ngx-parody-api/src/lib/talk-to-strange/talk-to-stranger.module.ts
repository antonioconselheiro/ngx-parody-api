import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FindStrangerNostr } from './find-stranger.nostr';
import { FindStrangerService } from './find-stranger.service';
import { TalkToStrangerNostr } from './talk-to-stranger.nostr';
import { TalkToStrangeSession } from './talk-to-strange.session';
import { TalkToStrangeSigner } from './talk-to-strange.signer';
import { NostrModule } from '../nostr/nostr.module';
import { TalkToStrangeConfig } from './talk-to-strange.config';

@NgModule({
  imports: [
    CommonModule,
    NostrModule
  ],
  providers: [
    FindStrangerNostr,
    FindStrangerService,
    TalkToStrangeSession,
    TalkToStrangerNostr,
    TalkToStrangeSigner,
    TalkToStrangeConfig
  ]
})
export class TalkToStrangerModule { }