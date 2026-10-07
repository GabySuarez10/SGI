import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { EditarProveedor } from './editar-proveedor';

describe('EditarProveedor', () => {
  let component: EditarProveedor;
  let fixture: ComponentFixture<EditarProveedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarProveedor],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarProveedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
