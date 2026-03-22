export interface BaseOverride {
  baseId: string;
  fuel: number;
  aircraftCount: number;
  ammunition: { type: string; quantity: number }[];
  spareParts: { id: string; quantity: number }[];
}

export interface SetupOverrides {
  bases: BaseOverride[];
}
