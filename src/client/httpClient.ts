import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface HttpRequest {
    url: string;
    method: string;
    baseUrl?: string;
    headers?: Record<string, string>;
    body?: any;
}

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    time: number;
    error?: string;
}

export class HttpClient {
    async sendRequest(request: HttpRequest): Promise<HttpResponse> {
        const startTime = Date.now();
        
        // Robust URL merging
        let fullUrl = request.url;
        if (request.baseUrl) {
            const base = request.baseUrl.replace(/\/+$/, '');
            const path = request.url.replace(/^\/+/, '');
            fullUrl = `${base}/${path}`;
        }

        try {
            const config: AxiosRequestConfig = {
                url: fullUrl,
                method: request.method,
                headers: { ...request.headers }, // Clone to avoid side effects
                timeout: 30000,
                validateStatus: () => true,
                transformResponse: [(data) => {
                    try {
                        return JSON.parse(data);
                    } catch (e) {
                        return data;
                    }
                }]
            };

            // Support body for any method (though GET/DELETE usually don't have them)
            if (request.body) {
                if (typeof request.body === 'string' && request.body.trim().startsWith('{')) {
                    try {
                        config.data = JSON.parse(request.body);
                    } catch {
                        config.data = request.body;
                    }
                } else {
                    config.data = request.body;
                }

                // Auto-set Content-Type if missing
                if (!config.headers) config.headers = {};
                if (!config.headers['Content-Type'] && !config.headers['content-type']) {
                    if (typeof config.data === 'object') {
                        config.headers['Content-Type'] = 'application/json';
                    }
                }
            }

            const response: AxiosResponse = await axios(config);
            const endTime = Date.now();

            return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers as Record<string, string>,
                body: response.data,
                time: endTime - startTime
            };
        } catch (error) {
            const endTime = Date.now();
            let errorMessage = 'Unknown error occurred';
            let status = 0;
            let statusText = 'Error';

            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                if (axiosError.response) {
                    return {
                        status: axiosError.response.status,
                        statusText: axiosError.response.statusText,
                        headers: axiosError.response.headers as Record<string, string>,
                        body: axiosError.response.data,
                        time: endTime - startTime
                    };
                } else if (axiosError.request) {
                    errorMessage = 'No response received. The server might be down or unreachable.';
                    statusText = 'Network Error';
                } else {
                    errorMessage = axiosError.message;
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            return {
                status,
                statusText,
                headers: {},
                body: null,
                time: endTime - startTime,
                error: errorMessage
            };
        }
    }
}
