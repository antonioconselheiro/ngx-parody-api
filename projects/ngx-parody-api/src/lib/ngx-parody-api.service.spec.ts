import { TestBed } from '@angular/core/testing';

import { NgxParodyApiService } from './ngx-parody-api.service';

describe('NgxParodyApiService', () => {
  let service: NgxParodyApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxParodyApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
