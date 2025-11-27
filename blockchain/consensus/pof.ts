export function selectValidator(validators: string[]): string {
  // TODO: lógica de Proof of Flow híbrido
  return validators[Math.floor(Math.random() * validators.length)];
}
