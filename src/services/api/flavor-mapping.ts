/**
 * @fileoverview Mapeamento de IDs para sabores e opções
 * @module services/api/flavor-mapping
 */

/**
 * Mapeamento de IDs para sabores
 * Preencha com os IDs reais e seus nomes correspondentes
 */
export const FLAVOR_MAPPINGS: Record<string, string> = {
  // Sabores/variações encontradas nos logs
  '681e3f4b01d28118a2df8a43': 'Sabor Tradicional',
  '681e3d8501d28118a2df87cf': 'Chocolate',
  '682c7c494fc1c9f47c45849d': 'Galinha Caipira',
  '682f76ad9139c6af0ae5d53e': 'Aveia e Mel',
  '682f76ad9139c6af0ae5d53d': 'Erva Doce',
  '682f76ad9139c6af0ae5d53f': 'Lavanda',
  '68239bf3ecca70531f25833d': 'Concentrado Azul',
  '68239608ecca70531f257fa0': 'Lavanda',
  '682393faecca70531f257f29': 'Neutro',
  '682393faecca70531f257f28': 'Limão',
  '68262843ecca70531f2b8cc5': 'Álcool 70%',
  '681de9f701d28118a2df08ed': 'Flocos Finos',
  '681df26d01d28118a2df0edf': 'Milho',
  '681dfdcf01d28118a2df20c2': 'Chocolate',
  '681de8f801d28118a2df086b': 'Original',
  '682cfd254fc1c9f47c466fc0': 'Energy 2L',
  '682e09e84fc1c9f47c46abcd': 'Guaraná',
};

/**
 * Mapeamento de IDs para opções
 * Preencha com os IDs reais e seus nomes correspondentes
 */
export const OPTION_MAPPINGS: Record<string, string> = {
  // As mesmas opções também estão disponíveis como opções para facilitar a resolução
  '681e3f4b01d28118a2df8a43': 'Sabor Tradicional',
  '681e3d8501d28118a2df87cf': 'Chocolate',
  '682c7c494fc1c9f47c45849d': 'Galinha Caipira',
  '682f76ad9139c6af0ae5d53e': 'Aveia e Mel',
  '682f76ad9139c6af0ae5d53d': 'Erva Doce',
  '682f76ad9139c6af0ae5d53f': 'Lavanda',
  '68239bf3ecca70531f25833d': 'Concentrado Azul',
  '68239608ecca70531f257fa0': 'Lavanda',
  '682393faecca70531f257f29': 'Neutro',
  '682393faecca70531f257f28': 'Limão',
  '68262843ecca70531f2b8cc5': 'Álcool 70%',
  '681de9f701d28118a2df08ed': 'Flocos Finos',
  '681df26d01d28118a2df0edf': 'Milho',
  '681dfdcf01d28118a2df20c2': 'Chocolate',
  '681de8f801d28118a2df086b': 'Original',
  '682cfd254fc1c9f47c466fc0': 'Energy 2L',
  '682e09e84fc1c9f47c46abcd': 'Guaraná',
};

/**
 * Obtém o nome do sabor baseado no ID
 * @param id ID do sabor
 * @returns Nome do sabor ou undefined se não encontrado
 */
export function getFlavorName(id: string): string | undefined {
  return FLAVOR_MAPPINGS[id];
}

/**
 * Obtém o nome da opção baseado no ID
 * @param id ID da opção
 * @returns Nome da opção ou undefined se não encontrado
 */
export function getOptionName(id: string): string | undefined {
  return OPTION_MAPPINGS[id];
}

/**
 * Verifica se um valor parece ser um ID
 * @param value Valor a ser verificado
 * @returns true se parece ser um ID
 */
export function isLikelyID(value: string): boolean {
  return (
    /^[0-9a-f]{24}$/i.test(value) || // MongoDB ObjectId
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) || // UUID
    /^\d{1,10}$/.test(value) // ID numérico simples
  );
}