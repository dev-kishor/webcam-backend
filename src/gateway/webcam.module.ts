import { Module } from "@nestjs/common";
import { WebCamGateway } from "./webcam.gateway";

@Module({
    providers: [WebCamGateway],
})
export class WebCamModule {}