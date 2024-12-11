import { getTestBed, TestBed } from "@angular/core/testing";
import { NostrEvent, NostrFilter, NPoolOpts, NRelay1 } from "@nostrify/nostrify";
import { matchFilters } from "nostr-tools";
import { FindStrangerNostr } from "./find-stranger.nostr";
import { TalkToStrangerModule } from "./talk-to-stranger.module";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from "@angular/platform-browser-dynamic/testing";
import { Injectable } from "@angular/core";
import { POOL_OPTIONS_TOKEN } from "../injection-token/npool-options.token";

interface FindStrangerNostrSpec {
  validateEvent(wannachatEvent: NostrEvent, searchTags: Array<string>): boolean;
}

@Injectable()
export class MockNPoolOpts implements NPoolOpts<NRelay1> {
  
  open(url: string): NRelay1 {
    return new NRelay1(url);
  }

  async reqRouter(filters: NostrFilter[]): Promise<Map<string, NostrFilter[]>> {
    return new Map([[ 'ws://localhost:7777/', filters ]]);
  }

  async eventRouter(): Promise<string[]> {
    return [ 'ws://localhost:7777/' ];
  }
}

describe('Testing filter', () => {

  let service: FindStrangerNostrSpec;
  beforeAll(() => {
    getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting())
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TalkToStrangerModule
      ],
      providers: [
        {
          provide: POOL_OPTIONS_TOKEN,
          useClass: MockNPoolOpts
        }
      ]
    }).compileComponents();
    service = TestBed.inject(FindStrangerNostr) as any as FindStrangerNostrSpec;
  });
  
  it('event should match', () => {
    const event: NostrEvent = {
      content: "chating",
      created_at: 1728388365,
      id: "86e85a5a42b373b9b14938db2c06aee8952b7bd9baf0d82219336079b514e522",
      kind: 30315,
      pubkey: "5fafd083d6de86b2f04ce39449af685ee7e91d2c4822a5fc904f40f2c3ec7c20",
      sig: "4b47a1fafbde2be32063332eb4362b957c237d407eee8d724bc2e898648abadd265eda448d306d22e60ed2289a4a10f82cd2209debf6bbcd266112343fa5cdc5",
      tags: [
        ['d', 'general'],
        ['p', 'a1cf7669ece0bc3fdad393102e87c4f073ae85dfced43ca08b37d86728e25510'],
        ['t', 'chating'],
        ['t', 'omegle']
      ]
    };

    const filters: NostrFilter[] = [
      {
        kinds: [30315],
        "#t": [ "wannachat", "omegle"],
        since: 1728387745
      },
    
      {
        kinds: [30315],
        "#t": ["chating", "omegle"],
        "#p": ["a1cf7669ece0bc3fdad393102e87c4f073ae85dfced43ca08b37d86728e25510"]
      }
    ];

    expect(matchFilters(filters, event)).toBeTruthy();
  });

  it('filter service is available', () => {
    expect(service).toBeTruthy();
  });

  it('filter accept event', () => {
    const event: any = {
      content: "wannachat",
      kind: 30315,
      tags: [
        ['d', 'general'],
        ['p', 'a1cf7669ece0bc3fdad393102e87c4f073ae85dfced43ca08b37d86728e25510'],
        ['t', 'wannachat'],
        ['t', 'omegle']
      ]
    };

    expect(service.validateEvent(event, [ 'omegle' ])).toBeTruthy();
    expect(service.validateEvent(event, [ 'omegle', 'wannachat' ])).toBeTruthy();
  });

  it('filter reject event', () => {
    const event: any = {
      content: "wannachat",
      kind: 30315,
      tags: [
        ['d', 'general'],
        ['p', 'a1cf7669ece0bc3fdad393102e87c4f073ae85dfced43ca08b37d86728e25510'],
        ['t', 'wannachat'],
        ['t', 'omegle']
      ]
    };

    expect(service.validateEvent(event, [ 'omegle', 'brazil' ])).toBeFalsy();
    expect(service.validateEvent(event, [ 'brazil' ])).toBeFalsy();
  });
});
