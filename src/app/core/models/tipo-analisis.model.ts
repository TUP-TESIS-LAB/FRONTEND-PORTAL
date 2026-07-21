export interface TipoAnalisis {
  id: number | string;         // number from backend; string in mockup (Part 11 will unify)
  nombre: string;
  descripcionCorta: string;
  categoria: string;
  ayuno: boolean;
  icono: string;
  preparacion: string[];       // new: backend returns array
  determinationIds: number[];  // new: backend returns array
}
