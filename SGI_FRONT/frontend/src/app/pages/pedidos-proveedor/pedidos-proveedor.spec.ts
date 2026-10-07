import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PedidosProveedor } from './pedidos-proveedor';

describe('PedidosProveedor', () => {
  let component: PedidosProveedor;
  let fixture: ComponentFixture<PedidosProveedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosProveedor],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PedidosProveedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
