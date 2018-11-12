import { Component } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { GeoLocation } from '../geo-location.entities';

@Component()
export class GoogleGeocodingService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({ baseURL: 'https://maps.googleapis.com/maps/api/' });
    }

    public async getCoordinates(address: string): Promise<GeoLocation> {
        const googleApiKey = process.env.GOOGLE_API_KEY;
        const googleGeoCodingUrl = 'geocode/json?key=' + googleApiKey + '&address=' + encodeURIComponent(address);
        const geoCodeResponse = await this.client.get<GoogleGeocodeResponse>(googleGeoCodingUrl);
        return geoCodeResponse.data.results[0].geometry.location;
    }
}

class GoogleGeocodeResponse {
    results: GoogleGeocodeResult[];
}

class GoogleGeocodeResult {
    geometry: GoogleGeocodeGeometry;
}

class GoogleGeocodeGeometry {
    location: GeoLocation;
}