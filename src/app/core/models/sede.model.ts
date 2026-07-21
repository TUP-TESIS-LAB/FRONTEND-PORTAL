export interface Sede {
  id: string;           // coerced from backend number (String(b.id)) to preserve existing consumers
  nombre: string;
  direccion: string;
  telefono: string;     // empty string when backend does not expose phone
  horario: string;      // empty string when backend does not expose schedules
  distanciaKm?: number; // TODO: backend does not expose this field
}
