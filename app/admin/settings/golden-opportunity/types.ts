export type GoldenOpportunitySettings = {
  enabled: boolean;
  reviewPrice: number;
  provinceCapacity: number;
  cycleStart: string;
  displayHours: number;
  minimumAiScore: number;
  refundEnabled: boolean;
};

export const defaultGoldenOpportunitySettings: GoldenOpportunitySettings = {
  enabled: true,
  reviewPrice: 390000,
  provinceCapacity: 10,
  cycleStart: "08:00",
  displayHours: 24,
  minimumAiScore: 70,
  refundEnabled: true,
};
