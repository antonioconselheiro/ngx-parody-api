import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FindStrangerNostr } from './find-stranger.nostr';
import { FindStrangerParody } from './find-stranger.parody';
import { TalkToStrangerParody } from './talk-to-stranger.parody';
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
    FindStrangerParody,
    TalkToStrangerSession,
    TalkToStrangerParody,
    TalkToStrangerSigner,
    TalkToStrangerConfig
  ]
})
export class TalkToStrangerModule { }
