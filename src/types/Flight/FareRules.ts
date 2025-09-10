export interface FareRules {
    UserIp: string;
    SearchTokenId: string;
    Error: {
        ErrorCode: number;
        ErrorMessage: string;
    };
    Result: FareRulesResult[];
}

export interface FareRulesResult {
    Airline: string;
    Origin: string;
    Destination: string;
    FareBasisCode: string;
    FareRestriction: string;
    FareRuleDetail: string;
}