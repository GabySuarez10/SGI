import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { NuevoProducto } from './nuevo-producto';

describe('NuevoProducto', () => {
  let component: NuevoProducto;
  let fixture: ComponentFixture<NuevoProducto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoProducto],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoProducto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
