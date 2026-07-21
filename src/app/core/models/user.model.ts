export interface User {
  id: number;
  nombre: string;
  apellido: string;
  iniciales: string;
  dni: string;
  fechaNac: string;
  edad: number;
  sexo: 'F' | 'M' | 'X';
  ciudad: string;
  email: string;
  telefono: string;
  direccion?: string;

  cobertura: {
    tipo: string;
    nombre: string;
    plan?: string;
    afiliado?: string;
    vigente: boolean;
    venceEn?: string;
  };

  datosMedicos: {
    grupoSanguineo: string;
    alergias: string[];
    condiciones: string[];
    medicacionHabitual: string[];
    cirugiasPrevias: string[];
    ultimaRevision?: string;
    habitos?: {
      fuma: 'No' | 'Sí' | 'Ex';
      alcohol: 'No' | 'Ocasional' | 'Frecuente';
      actividadFisica?: string;
    };
  };

  contactoEmergencia?: {
    nombre: string;
    vinculo: string;
    telefono: string;
  };
}
