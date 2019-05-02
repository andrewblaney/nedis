import { JoiObject } from 'joi';

export interface SchemaDefinition {
    name: string;
    pk: string;
    schema: JoiObject;
}

export interface NedisConfig {
    host?: string;
    port?: number;
}
