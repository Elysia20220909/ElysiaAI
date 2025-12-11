interface ABTestVariant {
    id: string;
    name: string;
    weight: number;
    config: Record<string, unknown>;
}
interface ABTest {
    id: string;
    name: string;
    description: string;
    variants: ABTestVariant[];
    active: boolean;
    startDate: Date;
    endDate?: Date;
    metrics: {
        impressions: Map<string, number>;
        conversions: Map<string, number>;
        averageRating: Map<string, number[]>;
    };
}
declare class ABTestManager {
  private tests;
  private userAssignments;
  constructor();
  private initializeDefaultTests;
  createTest(options: {
        id: string;
        name: string;
        description: string;
        variants: ABTestVariant[];
        endDate?: Date;
    }): ABTest;
  assignVariant(testId: string, userId: string): ABTestVariant | null;
  recordConversion(testId: string, userId: string): void;
  recordRating(testId: string, userId: string, rating: number): void;
  getTestResults(testId: string): {
        testId: string;
        name: string;
        description: string;
        active: boolean;
        startDate: Date;
        endDate: Date | undefined;
        results: {
            variantId: string;
            name: string;
            impressions: number;
            conversions: number;
            conversionRate: number;
            averageRating: number;
            sampleSize: number;
        }[];
    } | null;
  endTest(testId: string): void;
  listTests(): {
        id: string;
        name: string;
        description: string;
        active: boolean;
        startDate: Date;
        endDate: Date | undefined;
        variantCount: number;
    }[];
}
export declare const abTestManager: ABTestManager;
export {};
//# sourceMappingURL=ab-testing.d.ts.map