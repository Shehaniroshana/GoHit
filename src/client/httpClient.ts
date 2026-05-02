import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface HttpRequest {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
}

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    error?: string;
}

export class HttpClient {
    async sendRequest(request: HttpRequest): Promise<HttpResponse> {
        const startTime = Date.now();

        try {
            const config: AxiosRequestConfig = {
                url: request.url,
                method: request.method,
                headers: request.headers || {},
                timeout: 30000,
                validateStatus: () => true
            };

            if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
                if (typeof request.body === 'string') {
                    try {
                        config.data = JSON.parse(request.body);
                    } catch {
                        config.data = request.body;
                    }
                } else {
                    config.data = request.body;
                }

                if (!config.headers) {
                    config.headers = {};
                }
                
                // Only set application/json if we managed to parse it or it was an object
                if (typeof config.data === 'object') {
                    config.headers['Content-Type'] = 'application/json';
                }
            }

            const response: AxiosResponse = await axios(config);
            const endTime = Date.now();

            return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers as Record<string, string>,
                body: this.formatResponseBody(response.data),
                time: endTime - startTime
            };
        } catch (error) {
            const endTime = Date.now();

            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;

                if (axiosError.response) {
                    return {
                        status: axiosError.response.status,
                        statusText: axiosError.response.statusText,
                        headers: axiosError.response.headers as Record<string, string>,
                        body: this.formatResponseBody(axiosError.response.data),
                        time: endTime - startTime
                    };
                } else if (axiosError.request) {
                    return {
                        status: 0,
                        statusText: 'Network Error',
                        headers: {},
                        body: '',
                        time: endTime - startTime,
                        error: 'No response received from server. Check your network connection and server status.'
                    };
                }
            }

            return {
                status: 0,
                statusText: 'Error',
                headers: {},
                body: '',
                time: endTime - startTime,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private formatResponseBody(data: any): string {
        if (typeof data === 'string') {
            return data;
        }

        if (typeof data === 'object') {
            try {
                return JSON.stringify(data, null, 2);
            } catch {
                return String(data);
            }
        }

        return String(data);
    }
}
