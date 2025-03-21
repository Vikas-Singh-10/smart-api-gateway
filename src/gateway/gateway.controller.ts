import { Controller, Post, Get, Body, Param, Put, Query, NotFoundException } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { CreateGatewayDto } from './dtos/create-gateway.dto';
import { UpdateGatewayDto } from './dtos/update-gateway.dto';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('create')
  async createGateway(@Body() createGatewayDto: CreateGatewayDto) {
    return await this.gatewayService.createGateway(createGatewayDto);
  }

  @Get(':id')
  async getGatewayById(@Param('id') id: string) {
    return await this.gatewayService.getGatewayById(id);
  }


  @Get()  // Optional Route for querying by ID through query params
  async getByQuery(@Query('id') id: string) {
      if (!id) throw new NotFoundException('ID is required in query params');
      return this.gatewayService.getGatewayById(id);
  }

  @Put(':id')
  async updateGateway(
    @Param('id') id: string,
    @Body() updateGatewayDto: UpdateGatewayDto,
  ) {
    return await this.gatewayService.updateGateway(id, updateGatewayDto);
  }
}
