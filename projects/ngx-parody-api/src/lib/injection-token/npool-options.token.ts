import { InjectionToken } from "@angular/core";
import { NPoolOpts, NRelay1 } from "@nostrify/nostrify";

export const POOL_OPTIONS_TOKEN = new InjectionToken<NPoolOpts<NRelay1>>('NPoolOptsNRelay1');