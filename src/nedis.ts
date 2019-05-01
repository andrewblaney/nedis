
import * as Joi from 'joi';
import * as redis from 'redis';

export interface SchemaDefinition {
  name: string;
  pk: string;
  schema: Joi.JoiObject;
}

interface NedisConfig {
  host?: string;
  port?: number;
}

class UnregisteredSchemaError extends Error {
  constructor(tableName: string) {
    super(`Schema ${tableName} is not registered.`);
  }
}

class ValidationError extends Error {
  constructor(JoiMessage: string) {
    super(JoiMessage);
  }
}

class DuplicateSchemaError extends Error {
  constructor(tableName: string) {
    super(`${tableName} schema is already registered.`);
  }
}

export class NedisClient {
  registeredSchemas: SchemaDefinition[];
  config: NedisConfig;
  private redis: redis.RedisClient;

  constructor(config: NedisConfig = {}) {
    this.registeredSchemas = [];
    this.setConfig(config);
  }

  public registerSchema(SchemaDef: SchemaDefinition): void {
    if (this.registeredSchemas.find(s => s.name === SchemaDef.name)) {
      throw new DuplicateSchemaError(SchemaDef.name);
    }
    this.registeredSchemas.push(SchemaDef);
  }

  public registerSchemas(SchemaDefs: SchemaDefinition[]): void {
    SchemaDefs.map((sd) => { this.registerSchema(sd); });
  }

  public getRegisteredSchemas(): SchemaDefinition[] {
    return this.registeredSchemas;
  }

  public isConnected(): boolean {
    return this.redis.connected;
  }

  public getRedisClient(): redis.RedisClient {
    return this.redis;
  }

  public getSchema(table: string): SchemaDefinition {
    const matchingSchema = this.registeredSchemas.find(s => s.name === table);
    if (!matchingSchema) {
      throw new UnregisteredSchemaError(table);
    }
    return matchingSchema;
  }

  public validateData(data: object, JoiSchema: Joi.JoiObject): boolean {
    const result = Joi.validate(data, JoiSchema);
    if (!result.error) {
      return true;
    } else {
      throw new ValidationError(result.error.message);
    }
  }

  public insert(table: string, data: object) {
    const schemaDef = this.getSchema(table);
    this.validateData(data, schemaDef.schema);
  }

  private setConfig(config: NedisConfig): void {
    this.config = Object.assign({
      host: 'localhost',
      port: 6379
    }, config);

    this.redis = redis.createClient(this.config);
  }
}

export function createClient(config?: NedisConfig): NedisClient {
  return new NedisClient(config);
}
