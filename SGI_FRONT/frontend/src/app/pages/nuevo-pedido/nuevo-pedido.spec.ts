import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { NuevoPedido } from './nuevo-pedido';

describe('NuevoPedido', () => {
  let component: NuevoPedido;
  let fixture: ComponentFixture<NuevoPedido>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoPedido],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoPedido);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
