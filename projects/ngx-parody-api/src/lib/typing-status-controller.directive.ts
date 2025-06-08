import { Directive, HostListener } from '@angular/core';
import { TalkToStrangerParody } from '../public-api';

@Directive({
  selector: '[omgTypingStatusController]',
  standalone: true
})
export class TypingStatusControllerDirective {

  readonly typingTimeoutAmount = 2_000;

  typingTimeoutId = 0;
  isTyping = false;

  constructor(
    private talkToStrangerParody: TalkToStrangerParody
  ) { }

  @HostListener('keydown', ['$event.target'])
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
