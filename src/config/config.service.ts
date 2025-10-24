// src/config/config.service.ts
import { Injectable } from '@nestjs/common';


@Injectable()
export class ConfigService {
get(key: string, fallback?: string): string {
return process.env[key] ?? fallback;
}
}