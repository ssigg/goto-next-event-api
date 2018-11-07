import { Component } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";

@Component()
export class IcloudService {
    private client: AxiosInstance;
    
    constructor() {
        this.client = axios.create({ baseURL: 'https://p05-calendarws.icloud.com/ca/subscribe/1/' });
    }

    public async getIcalString(calendarId: string): Promise<string> {
        let response = await this.client.get(calendarId);
        return response.data;
    }
}