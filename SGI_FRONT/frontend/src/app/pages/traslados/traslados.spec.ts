import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Traslados } from './traslados';

describe('Traslados', () => {
  let component: Traslados;
  let fixture: ComponentFixture<Traslados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Traslados]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Traslados);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
