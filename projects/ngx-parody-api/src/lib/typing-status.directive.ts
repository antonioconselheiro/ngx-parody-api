import { Directive, HostListener } from '@angular/core';
import { TalkToStrangerParody } from '../public-api';

@Directive({
  selector: '[parodyTypingStatus]',
  standalone: true
})
export class TypingStatusDirective {

  readonly typingTimeoutAmount = 2_000;

  typingTimeoutId = 0;
  isTyping = false;

  constructor(
    private talkToStrangerParody: TalkToStrangerParody
  ) { }

  @HostListener('keydown')
  onTyping(): void {
    if (!this.typingTimeoutId) {
      this.talkToStrangerParody.isTyping();
      this.isTyping = true;
    }

    clearTimeout(this.typingTimeoutId);
    this.typingTimeoutId = Number(setTimeout(() => {
      if (this.isTyping) {
        this.talkToStrangerParody.stopTyping();
        this.isTyping = false;
      }
      this.typingTimeoutId = 0;
    }, this.typingTimeoutAmount));
  }
}
