import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FindStrangeNostr } from './find-strange.nostr';
import { FindStrangeService } from './find-strange.service';
import { TalkToStrangeNostr } from './talk-to-strange.nostr';
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
    FindStrangeNostr,
    FindStrangeService,
    TalkToStrangeSession,
    TalkToStrangeNostr,
    TalkToStrangeSigner,
    TalkToStrangeConfig
  ]
})
export class TalkToStrangeModule { }
