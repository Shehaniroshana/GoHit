export interface EndpointInfo {
    method: string;
    path: string;
    framework: 'net/http' | 'gin' | 'fiber' | 'echo' | 'chi' | 'mux' | 'annotation' | 'unknown';
    line: number;
    handler?: string;
}

export interface ParseResult {
    endpoints: EndpointInfo[];
    hasHandlers: boolean;
}
