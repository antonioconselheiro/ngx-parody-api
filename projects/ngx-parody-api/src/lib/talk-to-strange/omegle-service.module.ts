import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FindStrangerNostr } from './find-stranger.nostr';
import { FindStrangerService } from './find-stranger.service';
import { TalkToStrangerNostr } from './talk-to-stranger.nostr';
import { TalkToStrangeSession } from './talk-to-strange.session';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    FindStrangerNostr,
    FindStrangerService,
    TalkToStrangeSession,
    TalkToStrangerNostr
  ]
})
export class OmegleServiceModule { }
