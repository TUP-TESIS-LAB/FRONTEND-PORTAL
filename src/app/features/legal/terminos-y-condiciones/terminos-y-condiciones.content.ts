// Contenido legal (términos y condiciones + política de privacidad).
// Migrado desde 2025-P4-FE/patient-portal (feature/screens/privacy-policies),
// tenant-izado: el nombre del laboratorio y los datos de contacto se toman
// del tenant activo en vez de venir hardcodeados.

export type ContentItem =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'subtitle'; text: string };

export interface LegalSection {
  title: string;
  content: ContentItem[];
}

export interface LegalContent {
  header: {
    title: string;
    lastUpdated: string;
  };
  sections: LegalSection[];
}

export function buildTermsContent(
  tenantName: string,
  contactEmail?: string,
  address?: string,
): LegalContent {
  return {
    header: {
      title: `Términos y Condiciones y Política de Privacidad de ${tenantName}`,
      lastUpdated: '19 de noviembre de 2025',
    },
    sections: [
      {
        title: '1. Introducción, objeto y alcance',
        content: [
          {
            type: 'paragraph',
            text:
              `En ${tenantName} (en adelante, "el Laboratorio" o "nosotros") valoramos su ` +
              'privacidad y nos comprometemos a proteger sus datos personales, especialmente ' +
              'la información sensible de salud, en cumplimiento con la normativa vigente. Al ' +
              'acceder y utilizar nuestros sistemas y servicios, usted acepta las prácticas ' +
              'descritas en este documento.',
          },
          { type: 'subtitle', text: '1.1. Objetivo y contenido' },
          {
            type: 'paragraph',
            text:
              'Este documento describe la manera en que el Laboratorio recopila, utiliza, ' +
              'almacena, comparte y protege la información personal y sensible de los ' +
              'usuarios. También explica sus derechos como titular de los datos.',
          },
          { type: 'subtitle', text: '1.2. Alcance' },
          {
            type: 'paragraph',
            text:
              'Rige el tratamiento de datos personales de todos los usuarios (pacientes, ' +
              'médicos, proveedores) y aplica a la información obtenida a través de los ' +
              'canales de atención del Laboratorio.',
          },
          { type: 'subtitle', text: '1.3. Ámbito de aplicación' },
          { type: 'paragraph', text: 'Aplica a:' },
          {
            type: 'list',
            items: [
              'Pacientes (adultos y menores representados por padres/tutores).',
              'Profesionales médicos.',
              'Personal administrativo y técnico.',
              'Usuarios del portal web y autogestión.',
              'Usuarios de servicios telefónicos y presenciales.',
            ],
          },
          { type: 'paragraph', text: 'Sistemas a los que aplica:' },
          {
            type: 'list',
            items: [
              'Sistema de Gestión de Laboratorio (LIS/LIMS).',
              'Portal de autogestión y portal de resultados para pacientes.',
              'Sistema de turnos (web, móvil, secretaría).',
              'Sistemas asociados del laboratorio.',
            ],
          },
          { type: 'paragraph', text: 'Procesos cubiertos:' },
          {
            type: 'list',
            items: [
              'Reserva, cancelación y gestión de turnos.',
              'Validación de órdenes y requisitos.',
              'Procesamiento de muestras y resultados.',
              'Entrega de informes.',
              'Facturación, autorizaciones y auditorías.',
              'Estadísticas internas y mejora continua.',
            ],
          },
        ],
      },
      {
        title: '2. Marco normativo y legal',
        content: [
          {
            type: 'paragraph',
            text: 'Este documento cumple con la legislación vigente aplicable al tratamiento de datos en el sector salud.',
          },
          { type: 'subtitle', text: '2.1. Ley 25.326 – Protección de Datos Personales (Argentina)' },
          {
            type: 'paragraph',
            text:
              'Define qué es un dato personal, cómo debe manejarse, derechos del titular y ' +
              'obligaciones del responsable de la base de datos. El laboratorio debe obtener ' +
              'consentimiento, garantizar acceso, rectificación, actualización y supresión, y ' +
              'aplicar medidas de seguridad adecuadas.',
          },
          { type: 'subtitle', text: '2.2. Decreto Reglamentario 1558/2001' },
          {
            type: 'paragraph',
            text:
              'Establece las pautas operativas para la Ley 25.326: transferencias ' +
              'internacionales, tiempos de respuesta y obligaciones del responsable de la ' +
              'base de datos.',
          },
          { type: 'subtitle', text: '2.3. Normativa del Ministerio de Salud / SISA' },
          {
            type: 'paragraph',
            text:
              'Exige la notificación de Eventos de Notificación Obligatoria (ENO): ciertos ' +
              'resultados y diagnósticos deben comunicarse al sistema nacional según normativa.',
          },
          { type: 'subtitle', text: '2.4. ISO 27001 – Seguridad de la información' },
          {
            type: 'paragraph',
            text:
              'Define controles de seguridad para garantizar confidencialidad, integridad y ' +
              'disponibilidad: políticas de acceso, contraseñas, backups, cifrado, auditorías.',
          },
          {
            type: 'paragraph',
            text:
              '2.5. Responsabilidad como responsable del tratamiento: el laboratorio es ' +
              'responsable de la custodia de los datos, su tratamiento adecuado, su ' +
              'confidencialidad y la adopción de medidas técnicas y organizacionales.',
          },
        ],
      },
      {
        title: '3. Tipos de datos recopilados por el sistema',
        content: [
          {
            type: 'paragraph',
            text: 'Recopilamos y tratamos diferentes categorías de información, siempre limitándonos a lo necesario para la prestación del servicio.',
          },
          { type: 'subtitle', text: '3.1. Datos personales identificatorios' },
          {
            type: 'list',
            items: [
              'Nombre, apellido, DNI/CUIT/pasaporte, fecha de nacimiento, domicilio, teléfono, correo electrónico.',
            ],
          },
          { type: 'subtitle', text: '3.2. Datos sensibles de salud (requieren consentimiento expreso)' },
          {
            type: 'paragraph',
            text: 'Órdenes médicas, resultados de análisis, estudios de laboratorio, diagnósticos asociados y antecedentes de salud relevantes para la prestación del servicio.',
          },
          { type: 'subtitle', text: '3.3. Datos administrativos' },
          {
            type: 'paragraph',
            text: 'Información de cobertura (obra social/prepaga), número de afiliado, autorizaciones, comprobantes de pago.',
          },
          { type: 'subtitle', text: '3.4. Datos técnicos recopilados automáticamente' },
          {
            type: 'list',
            items: [
              'Direcciones IP, logs de actividad, trazabilidad de acceso (fecha, hora, acción), identificadores de sesión, datos de auditoría.',
            ],
          },
          { type: 'subtitle', text: '3.5. Datos opcionales' },
          {
            type: 'paragraph',
            text: 'Sugerencias, comentarios o datos que el usuario nos proporciona voluntariamente para mejorar la atención.',
          },
        ],
      },
      {
        title: '4. Finalidad del tratamiento de datos',
        content: [
          {
            type: 'paragraph',
            text: 'Los datos personales son tratados con el fin de garantizar la correcta prestación de los servicios de laboratorio, para los siguientes propósitos esenciales:',
          },
          {
            type: 'list',
            items: [
              'Gestión de turnos: solicitud, confirmación, cancelación y reprogramación de citas.',
              'Gestión operativa interna: organización de agenda, asignación de boxes y profesionales, coordinación de la atención.',
              'Validación y requisitos: verificación de requisitos pre-estudio y gestión de autorizaciones con entidades de salud.',
              'Comunicación con el paciente: recordatorios, avisos y notificaciones sobre el estado de la muestra y disponibilidad de resultados.',
              'Publicación y gestión de resultados: acceso seguro a los estudios a través del portal del paciente.',
              'Auditoría interna, trazabilidad y seguridad: registros de acceso para fines de seguridad, cumplimiento normativo y prevención de fraude.',
              'Estadísticas y mejora continua: generación de estadísticas e informes de gestión utilizando datos anonimizados o seudonimizados.',
            ],
          },
        ],
      },
      {
        title: '5. Modalidad de recolección y almacenamiento',
        content: [
          { type: 'subtitle', text: '5.1. Recolección de datos' },
          {
            type: 'paragraph',
            text:
              'Los datos pueden ser recolectados a través del portal web/móvil de ' +
              'autogestión (formularios de registro y solicitud de turnos), la interacción ' +
              'presencial en nuestras sedes (secretaría, tótem de autogestión) y la ' +
              'integración interna con sistemas legados para la unificación de la historia ' +
              'clínica.',
          },
          { type: 'subtitle', text: '5.2. Almacenamiento y seguridad física/lógica' },
          {
            type: 'paragraph',
            text:
              'Los datos son almacenados en servidores propios del Laboratorio, ubicados en ' +
              'Argentina. Toda comunicación entre el usuario y el portal se realiza mediante ' +
              'protocolos seguros (HTTPS/TLS). Se aplican medidas de cifrado a las bases de ' +
              'datos sensibles y a las copias de seguridad para proteger la información de ' +
              'accesos no autorizados.',
          },
        ],
      },
      {
        title: '6. Acceso, roles y permisos de usuarios',
        content: [
          {
            type: 'paragraph',
            text: 'Implementamos un estricto control de acceso basado en roles para garantizar que la información sensible solo sea vista por personal autorizado y necesario.',
          },
          {
            type: 'list',
            items: [
              'Roles internos (bioquímicos, secretarios, administrativos, técnicos, sistemas): acceso limitado a la información indispensable para el cumplimiento de sus funciones.',
              'Roles externos (pacientes, médicos derivantes): acceso restringido a la información propia o de sus pacientes/derivaciones, a través de credenciales seguras.',
              'Trazabilidad obligatoria: todos los accesos, modificaciones y eliminaciones de datos quedan registrados en logs de auditoría, indicando qué rol realizó qué acción, en qué momento y desde dónde.',
              'Mecanismos de autenticación: se exige el uso de contraseñas fuertes y se implementan controles de sesión (por ejemplo, expiración automática por inactividad).',
            ],
          },
        ],
      },
      {
        title: '7. Seguridad de la información',
        content: [
          {
            type: 'paragraph',
            text: 'El Laboratorio mantiene medidas de seguridad técnicas y organizacionales para proteger la integridad, confidencialidad y disponibilidad de sus datos.',
          },
          { type: 'subtitle', text: '7.1. Medidas técnicas' },
          {
            type: 'paragraph',
            text: 'Cifrado robusto, sistemas de control de acceso, monitoreo continuo de la red, detección de accesos no autorizados e infraestructura de respaldo.',
          },
          { type: 'subtitle', text: '7.2. Medidas organizacionales' },
          {
            type: 'paragraph',
            text: 'Definición estricta de perfiles y permisos de acceso, política interna de contraseñas y capacitación periódica del personal en materia de protección de datos y confidencialidad.',
          },
        ],
      },
      {
        title: '8. Política de cookies y tecnologías similares',
        content: [
          {
            type: 'paragraph',
            text: 'Nuestro portal web puede utilizar cookies y tecnologías similares para asegurar el funcionamiento óptimo.',
          },
          { type: 'subtitle', text: '8.1. Cookies necesarias' },
          {
            type: 'paragraph',
            text: 'Son esenciales para la navegación básica y para mantener la sesión de usuario activa y segura. No recopilan información personal.',
          },
          { type: 'subtitle', text: '8.2. Cookies analíticas (opcional)' },
          {
            type: 'paragraph',
            text: 'Pueden utilizarse, si el usuario lo acepta, para analizar el uso del sitio, generar estadísticas de tráfico y mejorar la experiencia del usuario, utilizando información anonimizada.',
          },
        ],
      },
      {
        title: '9. Cesión y transferencia de datos',
        content: [
          {
            type: 'paragraph',
            text: 'Sus datos personales no serán vendidos, alquilados ni cedidos sin su consentimiento explícito, salvo en los siguientes casos:',
          },
          {
            type: 'list',
            items: [
              'Entidades de salud (obras sociales, mutuales, prepagas o gerenciadoras), para la gestión de la cobertura, la facturación y la autorización de estudios.',
              'Médicos derivantes, para la comunicación de resultados al médico solicitante.',
              'Otros laboratorios o instituciones, cuando se requieran estudios de referencia procesados por terceros.',
              'Proveedores tecnológicos que nos prestan servicios (por ejemplo, alojamiento o mantenimiento de software) y requieren acceso limitado a la información, bajo estrictas cláusulas de confidencialidad.',
            ],
          },
        ],
      },
      {
        title: '10. Conservación, backup y recuperación',
        content: [
          { type: 'subtitle', text: '10.1. Períodos de conservación' },
          {
            type: 'paragraph',
            text:
              'Los datos clínicos y la historia clínica se conservan por el plazo legalmente ' +
              'exigido por la normativa argentina vigente, generalmente no menor a 10 años ' +
              'desde la última prestación. El resto de los datos se conservan mientras sean ' +
              'necesarios para la finalidad para la que fueron recolectados.',
          },
          { type: 'subtitle', text: '10.2. Eliminación' },
          {
            type: 'paragraph',
            text: 'Una vez expirado el plazo legal de conservación, o si el titular lo solicita y no existe obligación legal de retenerlos, los datos serán eliminados de forma segura o anonimizados.',
          },
          { type: 'subtitle', text: '10.3. Procedimientos de recuperación' },
          {
            type: 'paragraph',
            text: 'El Laboratorio mantiene procedimientos de backup y restauración para garantizar la continuidad operativa y la disponibilidad de la información ante incidentes técnicos.',
          },
        ],
      },
      {
        title: '11. Derechos del titular y datos de contacto',
        content: [
          { type: 'subtitle', text: '11.1. Ejercicio de los derechos ARCO' },
          {
            type: 'list',
            items: [
              'Acceso: conocer qué datos suyos estamos tratando y la forma en que los tratamos.',
              'Rectificación: solicitar la corrección de datos inexactos o incompletos.',
              'Cancelación: solicitar la supresión de datos innecesarios, sujeto a las obligaciones legales de conservación.',
              'Oposición: oponerse al tratamiento de sus datos para fines específicos.',
            ],
          },
          { type: 'subtitle', text: '11.2. Canal de contacto para consultas y reclamos' },
          {
            type: 'paragraph',
            text:
              `Para ejercer sus derechos o realizar cualquier consulta sobre este documento, ` +
              `puede escribir a ${tenantName}` +
              (contactEmail ? ` al correo ${contactEmail}` : '') +
              (address ? `, o dirigirse a ${address}` : '') +
              '.',
          },
          {
            type: 'paragraph',
            text:
              'Cláusula AAIP: el titular de los datos personales tiene la facultad de ' +
              'ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no ' +
              'inferiores a seis meses, salvo que se acredite un interés legítimo al efecto ' +
              'conforme lo establecido en el artículo 14, inciso 3 de la Ley N.º 25.326. La ' +
              'Agencia de Acceso a la Información Pública, órgano de control de la Ley N.º ' +
              '25.326, tiene la atribución de atender las denuncias y reclamos que ' +
              'interpongan quienes resulten afectados en sus derechos por incumplimiento de ' +
              'las normas vigentes en materia de protección de datos personales.',
          },
        ],
      },
    ],
  };
}
