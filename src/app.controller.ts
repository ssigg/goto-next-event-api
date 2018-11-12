import { Controller, Post, Body } from '@nestjs/common';
import { IcloudService } from './ical/icloud.service';
import { IcalEvent, IcalCalendar } from './ical/ical.entities';
import { IcalParserService } from './ical/ical-parser.service';
import { TransportConnection } from './transport/transport.entities';
import { GoogleGeocodingService } from './google-geocoding/google-geocoding.service';
import { TransportService } from './transport/transport.service';
import { GeoLocation } from './geo-location.entities';

@Controller()
export class AppController {
  constructor(
    private readonly icloudService: IcloudService,
    private readonly icalParserService: IcalParserService,
    private readonly googleGeocodingService: GoogleGeocodingService,
    private readonly transportService: TransportService) { }

  @Post()
  public async getBestConnection(@Body() body: { calendarIds: string[], sourceLocation: GeoLocation, limit: number }): Promise<NextEventWithConnection[]> {
    const icalStrings = await Promise.all(body.calendarIds.map(async id => await this.icloudService.getIcalString(id)));
    const calendars = icalStrings.map(s => this.icalParserService.parse(s)).reduce((pv, cv) => pv.concat(cv), []);
    const coloredEvents = this.getColoredEvents(calendars, body.limit);
    const coloredEventsWithConnections = await this.getColoredEventsWithConnections(coloredEvents, body.sourceLocation);
    return coloredEventsWithConnections;
  }

  private getColoredEvents(calendars: IcalCalendar[], limit: number): ColoredIcalEvent[] {
    return calendars
      .map(c => c.events.map(e => new ColoredIcalEvent(c.color, e)))
      .reduce((pv, cv) => pv.concat(cv))
      .filter(e => e.event.startTimestamp > Date.now())
      .filter(e => e.event.geoLocation !== undefined || e.event.locationLines !== undefined)
      .sort((a, b) => a.event.startTimestamp - b.event.startTimestamp > 0 ? 1 : -1)
      .slice(0, limit);
  }

  private async getColoredEventsWithConnections(coloredEvents: ColoredIcalEvent[], sourceLocation: GeoLocation) {
    return await Promise.all(coloredEvents.map(async coloredEvent => {
      if (coloredEvent.event.geoLocation === undefined) {
        const eventLocation = coloredEvent.event.locationLines.join(', ');
        coloredEvent.event.geoLocation = await this.googleGeocodingService.getCoordinates(eventLocation);
      }
      const connection = await this.transportService.getBestConnection(sourceLocation, coloredEvent.event.geoLocation, coloredEvent.event.startTimestamp);
      return new NextEventWithConnection(coloredEvent, connection);
    }));
  }
}

class NextEventWithConnection {
  constructor(event: ColoredIcalEvent, connection: TransportConnection) {
    this.coloredEvent = event;
    this.connection = connection;
  }
  coloredEvent: ColoredIcalEvent;
  connection: TransportConnection;
}

class ColoredIcalEvent {
  constructor(color: string, event: IcalEvent) {
    this.color = color;
    this.event = event;
  }
  color: string;
  event: IcalEvent;
}