/**
 * IPC alimentaire — rebasement base 2025 → base 2015
 *
 * Les données INSEE BDM sont diffusées en base 2025 (100 = année 2025).
 * Pour l'affichage et les calculs on utilise la base 2015 (100 = année 2015).
 *
 * Formule : index_base2015 = index_base2025 × (100 / moyenne_annuelle_2015_base2025)
 * La constante est la **moyenne des 12 mois de 2015** (valeurs base 2025) dans
 * ipc_food_monthly, de sorte que la moyenne de l'année 2015 soit égale à 100.
 * Valeur calculée via Supabase (avg des mois 2015-01 à 2015-12) ≈ 75,063.
 * @see https://www.insee.fr/fr/metadonnees/definition/c1557
 */

/** Moyenne annuelle 2015 de l'IPC alimentaire en base 2025 (table ipc_food_monthly). Année 2015 = 100 après rebasement. */
export const IPC_BASE_2025_AVG_2015_ALIMENTATION = 75.063

/**
 * Convertit un indice IPC alimentaire base 2025 en base 2015.
 * La moyenne de l'année 2015 vaut 100.
 */
export function ipcToBase2015(indexValue2025: number): number {
  return (indexValue2025 * 100) / IPC_BASE_2025_AVG_2015_ALIMENTATION
}
