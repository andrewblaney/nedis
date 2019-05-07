import * as Redis from 'ioredis';
import * as Joi from 'joi';
import { ConnectionError, DatabaseInsertError, DuplicateSchemaError, ItemAlreadyExistsError, ItemNotFoundError, UnregisteredSchemaError, ValidationError } from './errors';
import { NedisConfig, SchemaDefinition } from './types';

export class NedisClient {
  config: NedisConfig;
  private registeredSchemas: SchemaDefinition[];
  private redis: Redis.Redis;
  private connected: boolean;

  constructor(config: NedisConfig = {}) {
    this.connected = false;
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

  public getRedisClient(): Redis.Redis {
    return this.redis;
  }

  public validateSchema(table: string): SchemaDefinition {
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

  public async insert(table: string, data): Promise<boolean> {
    await this.checkConnection();
    const schemaDef = this.validateSchema(table);
    this.validateData(data, schemaDef.schema);
    const key = this.getKey(table, data[schemaDef.pk]);
    const client = this.getRedisClient();
    const keyExists = await client.exists(key);

    if (keyExists) {
      throw new ItemAlreadyExistsError(key);
    }

    try {
      await this.addToIndex(table, key);
      await client.hmset(key, data);
      return true;
    } catch (err) {
      if (err instanceof DatabaseInsertError) { throw err; }
      throw new DatabaseInsertError(key, err.message);
    }
  }

  public async get(table: string, pk: string): Promise<object> {
    await this.checkConnection();
    const schemaDef = this.validateSchema(table);
    const result = await this.redis.hgetall(`${table}:${pk}`);
    if (!result[schemaDef.pk]) {
      throw new ItemNotFoundError(pk, table);
    }
    return result;
  }
  public async getAll(table: string): Promise<object[]> {
    await this.checkConnection();
    this.validateSchema(table);
    const members = await this.lmembers(table);
    return Promise.all(members.map(key => this.redis.hgetall(key)));
  }

  public async update(table: string, pk: string, data): Promise<object> {
    await this.checkConnection();
    const item = await this.get(table, pk);
    const updatedObject = Object.assign(item, data);
    await this.redis.hmset(this.getKey(table, pk), updatedObject);
    return updatedObject;
  }

  public async delete(table: string, pk: string): Promise<boolean> {
    await this.checkConnection();
    await this.get(table, pk);
    const key = this.getKey(table, pk);
    await this.redis.lrem(table, 1, key);
    await this.redis.del(key);
    return true;

  }

  public async lmembers(table: string): Promise<any> {
    return this.redis.lrange(table, 0, -1);
  }

  private async checkConnection(): Promise<NedisClient> {
    if (!this.connected) {
      await this.connect();
    }
    return this;
  }

  private async connect(): Promise<NedisClient> {
    try {
      await this.redis.connect();
      this.connected = true;
    } catch (err) {
      throw new ConnectionError(`Could not connect to redis at ${this.config.host}:${this.config.port}`);
    }
    return this;
  }

  private async addToIndex(table: string, key: string): Promise<boolean> {
    await this.checkConnection();
    const members = await this.lmembers(table);
    if (members.includes(key)) {
      throw new DatabaseInsertError(key, 'Key doesnt exist but key is in table set.');
    }
    await this.redis.rpush(table, key);
    return true;
  }

  private getKey(table: string, pk: string): string {
    return [table, pk].join(':');
  }

  private setConfig(config: NedisConfig): void {
    this.config = Object.assign({
      host: 'localhost',
      port: 6379,
      lazyConnect: true
    }, config);

    this.redis = new Redis(this.config)
      .on('error', error => {
        // console.error(error);
        // todo send this to logger in config
      });
  }
}

export function createClient(config?: NedisConfig): NedisClient {
  return new NedisClient(config);
}

export default {
  createClient
};
