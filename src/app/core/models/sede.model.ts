export interface Sede {
  id: string;           // coerced from backend number (String(b.id)) to preserve existing consumers
  nombre: string;
  direccion: string;
  telefono?: string;    // TODO: backend does not expose this field
  horario?: string;     // TODO: backend does not expose this field
  distanciaKm?: number; // TODO: backend does not expose this field
}
