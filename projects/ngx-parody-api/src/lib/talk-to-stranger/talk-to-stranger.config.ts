import { Injectable } from '@angular/core';
import { log } from '../util/log';

/**
 * Centralize shared constants for talk to stranger algorithm
 */
@Injectable()
export class TalkToStrangerConfig {

  readonly wannachatTimeoutInSeconds = {
    min: 17,
    max: 22
  };

  getTimeoutInSeconds(): number {
    const { min, max } = this.wannachatTimeoutInSeconds;
    const timeout = min + Math.floor(Math.random() * (max - min));
    log.debug(`random timeout generated: ${timeout} seconds`);
    return timeout;
  }

  getTimeoutInMilliseconds(): number {
    const oneMillisecond = 1000;
    const { min, max } = this.wannachatTimeoutInSeconds;
    const randomSeconds = max - min;
    const timeout = Math.floor((min + (Math.random() * randomSeconds)) * oneMillisecond);
    log.debug(`random timeout generated: ${timeout} milliseconds`);
    return timeout;
  }
}
