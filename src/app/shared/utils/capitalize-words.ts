/**
 * Capitaliza cada palabra de un string. El backend a veces manda nombres en
 * minúsculas ("mateo pillado") — esto se usa en puntos de presentación que
 * no pueden apoyarse en `text-transform: capitalize` en CSS (texto plano
 * como el de un p-select option o un mensaje de ConfirmationService).
 */
export function capitalizeWords(value: string): string {
  return value
    .split(' ')
    .map(word => word ? word[0].toUpperCase() + word.slice(1) : word)
    .join(' ');
}
