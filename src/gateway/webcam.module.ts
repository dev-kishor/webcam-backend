import { Module } from "@nestjs/common";
import { WebCamGateway } from "./webcam.gateway";
import { RideGateway } from "./ride.gateway";
import { MediasoupService } from "./mediasoup.service";

@Module({
    // controllers: [MediasoupService],
    // providers: [RideGateway,MediasoupService],
    providers: [WebCamGateway],
})
export class WebCamModule {}