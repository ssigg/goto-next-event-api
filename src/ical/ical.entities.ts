import { GeoLocation } from '../geo-location.entities';

export interface IcalElement { }

export class IcalRoot implements IcalElement {
    constructor() {
        this.calendars = [];
    }
    public calendars: IcalCalendar[];
}

export class IcalCalendar implements IcalElement {
    constructor() {
        this.events = [];
    }
    public name: string;
    public color: string;
    public events: IcalEvent[];
}

export class IcalEvent implements IcalElement {
    public startTimestamp: number;
    public endTimestamp: number;
    public locationLines: string[];
    public geoLocation: GeoLocation;
    public summary: string;
}