import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxParodyApiComponent } from './ngx-parody-api.component';

describe('NgxParodyApiComponent', () => {
  let component: NgxParodyApiComponent;
  let fixture: ComponentFixture<NgxParodyApiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxParodyApiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxParodyApiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
