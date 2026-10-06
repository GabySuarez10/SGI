import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface Proveedor {
  nombre: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  descripcion: string;
}

@Component({
  selector: 'app-editar-proveedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-proveedor.html',
  styleUrl: './editar-proveedor.css'
})
export class EditarProveedor {

  proveedor: Proveedor = {
    nombre: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    descripcion: ''
  };

  proveedores: Proveedor[] = [
    {
      nombre: 'Freddy Bogotá',
      telefono: '300 123 4567',
      direccion: 'Cra. 15 # 80-20',
      ciudad: 'Bogotá',
      descripcion: 'Proveedor de figuras decorativas.'
    },
    {
      nombre: 'Diego Cali',
      telefono: '310 987 6543',
      direccion: 'Cl. 12 # 5-30',
      ciudad: 'Cali',
      descripcion: 'Proveedor de figuras y artículos decorativos.'
    },
    {
      nombre: 'Proveedor X',
      telefono: '315 555 7890',
      direccion: 'Cra. 8 # 10-25',
      ciudad: 'Cali',
      descripcion: 'Proveedor general de productos.'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const nombreProveedor = this.route.snapshot.paramMap.get('nombre');

    if (!nombreProveedor) {
      this.router.navigate(['/proveedores']);
      return;
    }

    const proveedorEncontrado = this.proveedores.find(
      proveedor => proveedor.nombre === nombreProveedor
    );

    if (!proveedorEncontrado) {
      this.router.navigate(['/proveedores']);
      return;
    }

    this.proveedor = { ...proveedorEncontrado };
  }

  guardarCambios(): void {
    if (
      !this.proveedor.nombre.trim() ||
      !this.proveedor.telefono.trim() ||
      !this.proveedor.ciudad.trim()
    ) {
      alert('Completa los campos obligatorios.');
      return;
    }

    alert('Proveedor actualizado correctamente.');
    this.router.navigate(['/proveedores']);
  }

  cancelar(): void {
    this.router.navigate(['/proveedores']);
  }
}