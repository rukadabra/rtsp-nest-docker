import { Module } from '@nestjs/common';
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
export class AppModule {}
