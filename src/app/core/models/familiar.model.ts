export type Vinculo = 'Yo' | 'Hijo' | 'Hija' | 'Madre' | 'Padre' | 'Cónyuge' | 'Otro';

export interface Familiar {
  id: number;
  userPatientId: number;
  status: 'CREATED' | 'VERIFIED' | 'REJECTED';
  nombre: string;
  apellido: string;
  iniciales: string;
  edad: number;
  vinculo: Vinculo;
  dni: string;
  cobertura: string;             // TODO: backend does not return this in MVP
  proximoTurno?: {
    dia: string;
    fechaResumen: string;
  };
  totalTurnos: number;           // TODO: derive from appointments in a future iteration
  totalEstudios: number;         // TODO: derive from results in a future iteration
  accentColor: 'primary' | 'secondary' | 'accent';
}
