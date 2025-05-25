import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { UploadFiles } from '../../common/decorators/upload.helper';
import { Multer } from 'multer';
import { LanguageFilterDto } from './dto/language-filter.dto';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @ApiOperation({ summary: 'Get all Languages with filters' })
  @ApiResponse({ status: 200, description: 'List of Languages' })
  @Get()
  async findAll(@Query() query: LanguageFilterDto) {
    return await this.languagesService.findAllLanguages(query);
  }

  @ApiOperation({ summary: 'Create a new Language' })
  @ApiBody({ type: CreateLanguageDto })
  @ApiResponse({ status: 201, description: 'Language created successfully' })
  @Post()
  async createLanguage(@Body() createLanguageDto: CreateLanguageDto) {
    return await this.languagesService.createLanguage(createLanguageDto);
  }

  @ApiOperation({ summary: 'Update an existing Language' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Language to update.',
    type: 'string',
    example: 1,
  })
  @ApiBody({
    description: 'Provide the updated data for the Language.',
    type: UpdateLanguageDto,
  })
  @ApiResponse({ status: 200, description: 'Language updated successfully.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ) {
    return await this.languagesService.updateLanguage(+id, updateLanguageDto);
  }

  @ApiOperation({ summary: 'Get a Language by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Language to retrieve.',
    type: 'string',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Language retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Language not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.languagesService.findLanguage(+id);
  }

  @ApiOperation({ summary: 'Delete a Language by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Language to delete.',
    type: 'string',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Language deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Language not found.' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.languagesService.removeLanguage(+id);
  }
}
