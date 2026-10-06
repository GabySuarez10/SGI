import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class Configuracion {

  nombre = 'Gabriela Suárez';
  usuario = 'gabriela';
  correo = 'gabriela@pintarte.com';

  empresa = 'Pintarte';
  ciudad = 'Tuluá, Valle del Cauca';
  estadoEmpresa = 'Activa';

  guardarCuenta(): void {
    alert('Información de la cuenta actualizada correctamente.');
  }

  guardarEmpresa(): void {
    alert('Información de la empresa actualizada correctamente.');
  }
}