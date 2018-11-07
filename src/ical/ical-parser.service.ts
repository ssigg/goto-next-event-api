import { Component } from '@nestjs/common';
import { IcalCalendar, IcalElement, IcalRoot } from './ical.entities';
import { IcalElementParserFactoryInterface, IcalCalendarParserFactory, IcalEventParserFactory, IcalElementParserInterface } from './ical-parser.factories';

@Component()
export class IcalParserService {
    public parse(icalString: string): IcalCalendar[] {
        let parserFactories = [
            new IcalCalendarParserFactory(),
            new IcalEventParserFactory()
        ] as IcalElementParserFactoryInterface[];

        let lines = icalString.split('\n');
        let joinedLines: string[] = [];
        lines.map(line => {
            if (line.startsWith(' ') || line.startsWith('"')) {
                joinedLines[joinedLines.length - 1] = joinedLines[joinedLines.length - 1] + line.trim();
            } else {
                joinedLines.push(line);
            }
        });

        let rootElement = new IcalRoot();

        let activeParser: IcalElementParserInterface;
        let parentParserStack: IcalElementParserInterface[] = [];

        let activeElement: IcalElement = rootElement;

        for (let index in joinedLines) {
            let line = joinedLines[index];
            let newParser = parserFactories.map(f => f.create(line, activeElement)).find(f => f != null);
            if (newParser != null) {
                parentParserStack.push(activeParser);
                activeParser = newParser;
                activeElement = activeParser.getElement();
            }

            if (activeParser != null && activeParser.parseLineAndReturnCompleteness(line)) {
                activeParser = parentParserStack.pop();
                activeElement = activeParser != null ? activeParser.getElement() : rootElement;
            }
        }

        return rootElement.calendars;
    }
}