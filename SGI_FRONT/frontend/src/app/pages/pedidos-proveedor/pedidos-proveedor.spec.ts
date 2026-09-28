import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosProveedor } from './pedidos-proveedor';

describe('PedidosProveedor', () => {
  let component: PedidosProveedor;
  let fixture: ComponentFixture<PedidosProveedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosProveedor]
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
