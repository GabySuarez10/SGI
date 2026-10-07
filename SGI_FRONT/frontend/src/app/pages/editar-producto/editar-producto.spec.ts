import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { EditarProducto } from './editar-producto';

describe('EditarProducto', () => {
  let component: EditarProducto;
  let fixture: ComponentFixture<EditarProducto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarProducto],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarProducto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
