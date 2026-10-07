import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { NuevoProveedor } from './nuevo-proveedor';

describe('NuevoProveedor', () => {
  let component: NuevoProveedor;
  let fixture: ComponentFixture<NuevoProveedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoProveedor],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoProveedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
