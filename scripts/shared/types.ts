/** Agrégat (jour, carburant) pour upsert dans fuel_daily_agg */
export interface FuelDayAggregate {
  day: string
  fuelCode: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  sampleCount: number
}
