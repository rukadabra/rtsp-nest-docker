import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RtspModule } from './rtsp/rtsp.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    RtspModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'hls'),
      serveRoot: '/hls',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        next();
      })
      .forRoutes('/hls/*'); // Apply to all HLS routes
  }
}
