import { Component } from "@nestjs/common";
import { TransportEndPoint, TransportLocation, TransportConnection, TransportConnectionList } from "./transport.entities";
import * as moment from 'moment-timezone';
import axios, { AxiosInstance } from "axios";
import { GeoLocation } from "../geo-location.entities";

@Component()
export class TransportService {
    private client: AxiosInstance;
    
    constructor() {
        this.client = axios.create({ baseURL: 'https://transport.opendata.ch/v1/' });
    }

    public async getBestConnection(sourceLocation: GeoLocation, targetLocation: GeoLocation, targetTimestamp: number) {
        let sourceStation = await this.getBestStation(sourceLocation);
        let targetStation = await this.getBestStation(targetLocation);
        let connections = await this.getConnections(sourceStation, targetStation, targetTimestamp);
        let bestConnection = this.selectBestConnection(connections, targetTimestamp);
        return bestConnection;
    }
    
    private async getBestStation(position: GeoLocation): Promise<TransportEndPoint> {
        let query = 'x=' + position.lat + '&y=' + position.lng;
        let locationResponse = await this.client.get<TransportLocation>('locations?' + query);
        return locationResponse.data.stations.sort((a, b) => a.distance - b.distance > 0 ? 1 : -1)[0];
    }

    private async getConnections(start: TransportEndPoint, end: TransportEndPoint, arrivalTimestamp: number): Promise<TransportConnection[]> {
        let arrivalTime = moment(arrivalTimestamp).tz('Europe/Zurich');
        let arrivalDateString = arrivalTime.format('YYYY-MM-DD');
        let arrivalTimeString = arrivalTime.format('HH:mm');
        let query = 'from=' + start.name + '&to=' + end.name + '&date=' + arrivalDateString + '&time=' + arrivalTimeString + '&isArrivalTime=1';
        let connectionListResponse = await this.client.get<TransportConnectionList>('connections?' + query);
        return connectionListResponse.data.connections;
    }

    private selectBestConnection(connections: TransportConnection[], eventStartTimestamp: number): TransportConnection {
        return connections.reverse().find(c => this.getArrivalTimestamp(c) < eventStartTimestamp);
    }

    private getArrivalTimestamp(connection: TransportConnection): number {
        let walkFactor = 0.9;
        let lastSection = connection.sections[connection.sections.length - 1];
        if (lastSection.walk != null) {
            let walkDuration = lastSection.arrival.arrivalTimestamp - lastSection.departure.departureTimestamp;
            let difference = walkDuration - (walkDuration * walkFactor);
            let dateTime = this.parseTimeString(connection.to.arrival);
            return dateTime - difference * 6 * 1000;
        } else {
            let dateTime = this.parseTimeString(connection.to.arrival);
            return dateTime;
        }
    }

    private parseTimeString(dateString: string): number {
        let timestamp = moment.tz(dateString).toDate().valueOf();
        return timestamp;
    }
}