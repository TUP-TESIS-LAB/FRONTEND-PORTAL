// Contenido del centro de ayuda del portal del paciente.
//
// FUENTE A SINCRONIZAR: Backend/src/main/resources/rag/portal.md — es la base de
// conocimiento del asistente de ayuda (KAN-173) y describe los mismos flujos, pero
// escrita para el staff del laboratorio ("cómo el paciente hace X"). Acá la voz está
// invertida a segunda persona, dirigida al paciente.
//
// Si cambia un flujo del portal (nombres de botones, estados, cantidad de pasos),
// hay que actualizar los dos lados.
//
// Las respuestas son TEXTO PLANO a propósito: se renderizan con interpolación, no
// con [innerHTML]. No agregar HTML acá.

export type FaqCategoryId = 'cuenta' | 'turnos' | 'estudios' | 'familia';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: FaqCategoryId;
  title: string;
  /** Visible sin iniciar sesión. Solo 'cuenta': el resto describe pantallas
   *  a las que el usuario deslogueado no puede llegar. */
  publicVisible: boolean;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'cuenta',
    title: 'Cuenta y acceso',
    publicVisible: true,
    items: [
      {
        question: '¿Cómo entro al portal?',
        answer:
          'Ingresás con tu DNI (7 u 8 dígitos, sin puntos) y tu contraseña. Si todavía no ' +
          'tenés cuenta, tocá "Crear cuenta" en la pantalla de inicio de sesión y completá ' +
          'nombre, apellido, DNI, email y una contraseña de al menos 8 caracteres, con una ' +
          'mayúscula y un número.',
      },
      {
        question: 'Olvidé mi contraseña, ¿cómo la recupero?',
        answer:
          'En el inicio de sesión tocá "¿Olvidaste tu contraseña?", ingresá el email de tu ' +
          'cuenta y tocá "Enviar enlace". Te llega un mail con un enlace para elegir una ' +
          'contraseña nueva; si no lo ves, revisá la carpeta de spam. El enlace vence: si te ' +
          'avisa que es inválido o venció, pedí uno nuevo desde la misma pantalla.',
      },
      {
        question: 'El laboratorio me mandó un código por email, ¿qué hago con eso?',
        answer:
          'Es un código de primer acceso: significa que el laboratorio ya cargó tus datos y ' +
          'solo falta que elijas tu contraseña. Entrá a la pantalla de primer acceso, ingresá ' +
          'el código, escribí tu contraseña nueva (mínimo 8 caracteres), repetila y tocá ' +
          '"Crear contraseña".',
      },
    ],
  },
  {
    id: 'turnos',
    title: 'Turnos',
    publicVisible: false,
    items: [
      {
        question: '¿Cómo saco un turno?',
        answer:
          'Tocá "Sacar turno" y seguí los pasos: para quién es el turno, qué análisis ' +
          'necesitás, en qué sede, y qué día y horario. Al final ves un resumen y confirmás. ' +
          'Tené en cuenta que la fecha más cercana que podés reservar es de 2 días en adelante.',
      },
      {
        question: '¿Puedo cambiar o cancelar un turno que ya saqué?',
        answer:
          'Sí. Entrá a "Turnos", tocá el turno para abrir su detalle y ahí tenés "Reprogramar" ' +
          '(elegís nueva fecha y horario) o "Cancelar turno". La nueva fecha también tiene que ' +
          'ser de 2 días en adelante.',
      },
      {
        question: '¿Cómo sé si tengo que ir en ayunas?',
        answer:
          'La preparación aparece dos veces: en el resumen antes de confirmar el turno, y en ' +
          'el detalle del turno una vez sacado. Ahí te indica si requiere ayuno y con cuántos ' +
          'minutos de anticipación conviene que llegues.',
      },
    ],
  },
  {
    id: 'estudios',
    title: 'Estudios y resultados',
    publicVisible: false,
    items: [
      {
        question: '¿Cuándo puedo ver mis resultados?',
        answer:
          'En "Estudios" cada estudio muestra su estado: Disponible si ya podés verlo, o En ' +
          'proceso si el laboratorio todavía lo está trabajando. Los resultados que no abriste ' +
          'aparecen marcados como NUEVO.',
      },
      {
        question: '¿Cómo descargo el informe en PDF?',
        answer:
          'En "Estudios", en el estudio que diga Disponible, tocá el botón de descarga: el ' +
          'informe se abre en una pestaña nueva y desde ahí lo guardás o lo imprimís. Si el ' +
          'estudio todavía está en proceso, la descarga no está habilitada.',
      },
      {
        question: 'No encuentro un estudio en la lista.',
        answer:
          'Por defecto la lista muestra el último mes. Si el estudio es más viejo, ampliá el ' +
          'rango de fechas en los filtros. Y si gestionás a más de una persona, revisá que el ' +
          'filtro de paciente esté en la persona correcta.',
      },
    ],
  },
  {
    id: 'familia',
    title: 'Mi familia',
    publicVisible: false,
    items: [
      {
        question: '¿Puedo sacar turnos para mi hijo/a u otro familiar?',
        answer:
          'Sí, siempre que la persona esté en tu grupo familiar. Una vez agregada, cuando ' +
          'saques un turno el primer paso te deja elegir para quién es.',
      },
      {
        question: '¿Cómo agrego a alguien a mi grupo familiar?',
        answer:
          'Entrá a "Mi familia" y tocá "Agregar familiar" (en el celular, el botón +). ' +
          'Completá nombre, apellido, DNI y parentesco; la fecha de nacimiento y el género son ' +
          'opcionales. Queda cargado como pendiente de verificación hasta que el laboratorio ' +
          'lo confirme.',
      },
      {
        question: 'Gestiono los turnos de otras personas, pero yo no soy paciente. ¿Puedo atenderme?',
        answer:
          'Sí. Entrá a "Mi perfil": si tu cuenta administra a otras personas pero vos todavía ' +
          'no sos paciente, aparece el botón "Darme de alta como paciente". Al tocarlo quedás ' +
          'registrado y podés sacar tus propios turnos y ver tus estudios.',
      },
    ],
  },
];
