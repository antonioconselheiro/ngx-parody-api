/// <reference lib="webworker" />

import { UnsignedEvent } from "nostr-tools";
import { minePow } from "nostr-tools/nip13";

//  include pow to event, some relays require it for first event of a new pubkey
addEventListener('message', ({ data }) => {
  const { event, complexity = 11 } = data;
  const powEvent = minePow(event as UnsignedEvent, complexity);
  postMessage({ event: powEvent });
});
