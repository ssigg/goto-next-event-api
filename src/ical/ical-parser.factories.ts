import * as moment from 'moment-timezone';
import { IcalElement, IcalRoot, IcalCalendar, IcalEvent } from './ical.entities';
import { GeoLocation } from '../geo-location.entities';

export interface IcalElementParserFactoryInterface {
    create(line: string, parent: IcalElement): IcalElementParserInterface;
}

export interface IcalElementParserInterface {
    parseLineAndReturnCompleteness(line: string): boolean;
    getElement(): IcalElement;
}

export class IcalCalendarParserFactory implements IcalElementParserFactoryInterface {
    create(line: string, parent: IcalElement): IcalElementParserInterface {
        if (this.isMyStartLine(line)) {
            return new IcalCalendarParser(parent as IcalRoot);
        } else {
            return null;
        }
    }

    private isMyStartLine(line: string): boolean {
        return line.startsWith('BEGIN:VCALENDAR');
    }
}

export class IcalCalendarParser implements IcalElementParserInterface {
    private calendar: IcalCalendar;

    constructor(private root: IcalRoot) {
        this.calendar = new IcalCalendar();
        this.root.calendars.push(this.calendar);
    }

    parseLineAndReturnCompleteness(line: string): boolean {
        if (line.startsWith('X-WR-CALNAME')) {
            const parts = line.split(':');
            this.calendar.name = parts[parts.length - 1];
        }
        if (line.startsWith('X-APPLE-CALENDAR-COLOR')) {
            const parts = line.split(':');
            this.calendar.color = parts[parts.length - 1].substr(0, 7);
        }
        return this.isMyEndLine(line);
    }

    getElement(): IcalElement {
        return this.calendar;
    }

    private isMyEndLine(line: string): boolean {
        return line.startsWith('END:VCALENDAR');
    }
}

export class IcalEventParserFactory implements IcalElementParserFactoryInterface {
    create(line: string, parent: IcalElement): IcalElementParserInterface {
        if (this.isMyStartLine(line)) {
            return new IcalEventParser(parent as IcalCalendar);
        } else {
            return null;
        }
    }

    private isMyStartLine(line: string): boolean {
        return line.startsWith('BEGIN:VEVENT');
    }
}

export class IcalEventParser implements IcalElementParserInterface {
    private event: IcalEvent;

    constructor(private calendar: IcalCalendar) {
        this.event = new IcalEvent();
        this.calendar.events.push(this.event);
    }

    parseLineAndReturnCompleteness(line: string): boolean {
        if (line.startsWith('LOCATION')) {
            const parts = line.split(':');
            this.event.locationLines = parts[parts.length - 1]
                .split('\\n')
                .map(l => this.sanitizeString(l))
                .filter(l => l !== '');
        } else if (line.startsWith('SUMMARY')) {
            const parts = line.split('SUMMARY:');
            this.event.summary = this.sanitizeString(parts[parts.length - 1]);
        } else if (line.startsWith('DTSTART')) {
            const parts = line.split(':');
            const stringValue = parts[parts.length - 1];
            if (stringValue.indexOf('T') !== -1) {
                const stringValueWithoutSeconds = stringValue.substr(0, 13);
                const timeZone = parts[0].split('TZID=')[1];
                this.event.startTimestamp = moment.tz(stringValueWithoutSeconds, timeZone).toDate().valueOf();
            } else {
                const year: number = parseInt(stringValue.substr(0, 4), 10);
                const month: number = parseInt(stringValue.substr(4, 2), 10) - 1;
                const day: number = parseInt(stringValue.substr(6, 2), 10);
                this.event.startTimestamp = new Date(year, month, day).valueOf();
            }
        } else if (line.startsWith('DTEND')) {
            const parts = line.split(':');
            const stringValue = parts[parts.length - 1];
            if (stringValue.indexOf('T') !== -1) {
                const stringValueWithoutSeconds = stringValue.substr(0, 13);
                const timeZone = parts[0].split('TZID=')[1];
                this.event.endTimestamp = moment.tz(stringValueWithoutSeconds, timeZone).toDate().valueOf();
            } else {
                const year: number = parseInt(stringValue.substr(0, 4), 10);
                const month: number = parseInt(stringValue.substr(4, 2), 10) - 1;
                const day: number = parseInt(stringValue.substr(6, 2), 10);
                this.event.endTimestamp = new Date(year, month, day).valueOf();
            }
        } else if (line.indexOf('geo:') !== -1) {
            const parts = line.split('geo:');
            const stringValue = parts[parts.length - 1];
            const geoParts = stringValue.split(',');
            const latitude = parseFloat(geoParts[0]);
            const longitude = parseFloat(geoParts[1]);
            this.event.geoLocation = new GeoLocation();
            this.event.geoLocation.lat = latitude;
            this.event.geoLocation.lng = longitude;
        }
        return this.isMyEndLine(line);
    }
    getElement(): IcalElement {
        return this.event;
    }

    private sanitizeString(value: string): string {
        return value.replace('\r', '').replace('\\', '').replace('\u200e', '');
    }

    private isMyEndLine(line: string): boolean {
        return line.startsWith('END:VEVENT');
    }
}