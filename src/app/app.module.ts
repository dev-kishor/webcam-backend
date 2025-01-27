import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebCamModule } from 'src/gateway/webcam.module';

@Module({
  imports: [WebCamModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
