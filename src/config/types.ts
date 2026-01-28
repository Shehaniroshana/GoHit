export interface Environment {
    name: string;
    baseUrl: string;
}

export interface EnvironmentConfig {
    active: string;
    environments: Environment[];
}
