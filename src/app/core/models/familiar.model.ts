export type Vinculo = 'Hijo' | 'Hija' | 'Madre' | 'Padre' | 'Cónyuge' | 'Otro';

export interface Familiar {
  id: number;
  nombre: string;
  apellido: string;
  iniciales: string;
  edad: number;
  vinculo: Vinculo;
  dni: string;
  cobertura: string;
  proximoTurno?: {
    dia: string;
    fechaResumen: string;
  };
  totalTurnos: number;
  totalEstudios: number;
  accentColor: 'primary' | 'secondary' | 'accent';
}
