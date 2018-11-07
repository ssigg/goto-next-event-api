import { Module, NestModule, MiddlewaresConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { CorsMiddleware } from './cors.middleware';
import { IcloudService } from './ical/icloud.service';
import { IcalParserService } from './ical/ical-parser.service';
import { GoogleGeocodingService } from './google-geocoding/google-geocoding.service';
import { TransportService } from './transport/transport.service';

@Module({
  imports: [],
  controllers: [ AppController ],
  components: [ IcloudService, IcalParserService, GoogleGeocodingService, TransportService ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewaresConsumer): void | MiddlewaresConsumer {
    consumer.apply([CorsMiddleware]).forRoutes({
      path: '*', method: RequestMethod.ALL
    });
  }
}
