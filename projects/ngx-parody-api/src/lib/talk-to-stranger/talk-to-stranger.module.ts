import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FindStrangerNostr } from './find-stranger.nostr';
import { FindStrangerService } from './find-stranger.service';
import { TalkToStrangerNostr } from './talk-to-stranger.nostr';
import { TalkToStrangerSession } from './talk-to-stranger.session';
import { TalkToStrangerSigner } from './talk-to-stranger.signer';
import { NostrModule } from '../nostr/nostr.module';
import { TalkToStrangerConfig } from './talk-to-stranger.config';

@NgModule({
  imports: [
    CommonModule,
    NostrModule
  ],
  providers: [
    FindStrangerNostr,
    FindStrangerService,
    TalkToStrangerSession,
    TalkToStrangerNostr,
    TalkToStrangerSigner,
    TalkToStrangerConfig
  ]
})
export class TalkToStrangerModule { }
