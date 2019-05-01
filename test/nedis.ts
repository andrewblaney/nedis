import { assert } from 'chai';
import * as Joi from 'joi';
import nedis from '../src';
import { SchemaDefinition, NedisClient } from '../src/nedis';
import { RedisClient } from 'redis';
import { AssertionError } from 'assert';

const UserSchema = Joi.object().keys({
  id: Joi.string().required(),
  name: Joi.string().required(),
  age: Joi.number().required()
});

const DogSchema = Joi.object().keys({
  id: Joi.string().required(),
  name: Joi.string().required(),
  paws: Joi.number().required()
});

describe('nedis', () => {

  it('is a lib', () => {
    assert.isObject(nedis);
  });

  describe('configuration', () => {
    it('has defaults', () => {
      const client = nedis.createClient();
      assert.equal(client.config.host, 'localhost');
      assert.equal(client.config.port, 6379);
    });

    it('accepts a single override', () => {
      const client = nedis.createClient({ host: 'glubulhust' });
      assert.equal(client.config.host, 'glubulhust');
      assert.equal(client.config.port, 6379);
    });

    it('accepts multiple overrides', () => {
      const client = nedis.createClient({ host: 'glubulhust', port: 1234 });
      assert.equal(client.config.host, 'glubulhust');
      assert.equal(client.config.port, 1234);
    });

    it('has defaults when empty object is passed', () => {
      const client = nedis.createClient({});
      assert.equal(client.config.host, 'localhost');
      assert.equal(client.config.port, 6379);
    });
  });

  describe('schemas', () => {
    let client: NedisClient;

    beforeEach(() => {
      client = nedis.createClient();
    });

    it('individual schemas can be registered', () => {
      const userSchema: SchemaDefinition = { name: 'users', pk: 'id', schema: UserSchema };
      const dogSchema: SchemaDefinition = { name: 'dogs', pk: 'id', schema: DogSchema };
      client.registerSchema(userSchema);
      client.registerSchema(dogSchema);
      assert.include(client.registeredSchemas, userSchema);
      assert.include(client.registeredSchemas, dogSchema);
    });

    it('multiple schemas can be registered', () => {
      const userSchema: SchemaDefinition = { name: 'users', pk: 'id', schema: UserSchema };
      const dogSchema: SchemaDefinition = { name: 'dogs', pk: 'id', schema: DogSchema };
      client.registerSchemas([userSchema, dogSchema]);
    });

    it('throw a DuplicateSchemaError when registering a non unique schema name', () => {
      const userSchema: SchemaDefinition = { name: 'users', pk: 'id', schema: UserSchema };
      const dogSchema: SchemaDefinition = { name: 'dogs', pk: 'id', schema: DogSchema };
      client.registerSchemas([userSchema, dogSchema]);

      try {
        client.registerSchema(userSchema);
        assert.fail('DuplicateSchema exception not thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        assert.equal(e.message, 'users schema is already registered.');
      }
    });

    it('throw a DuplicateSchemaError when registering non unique multiple schemas', () => {
      const userSchema: SchemaDefinition = { name: 'users', pk: 'id', schema: UserSchema };
      const dogSchema: SchemaDefinition = { name: 'dogs', pk: 'id', schema: DogSchema };
      client.registerSchemas([userSchema, dogSchema]);

      try {
        client.registerSchemas([userSchema, dogSchema]);
        assert.fail('DuplicateSchema exception not thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        assert.equal(e.message, 'users schema is already registered.');
      }
    });

    xit('why does this work', () => {
      const userSchemaReg = { name: 'users', pk: 'id', schema: UserSchema, notAllowed: 'hello' };
      client.registerSchema(userSchemaReg);
      assert.include(client.registeredSchemas, userSchemaReg);
    });
  });

  describe('validation', () => {
    let client: NedisClient;

    beforeEach(() => {
      client = nedis.createClient();
    });

    it('throws a UnregisteredSchemaError if a unregistered schema is referenced', () => {
      try {
        client.insert('cats', {
          id: '1',
          name: 'mittens',
          paws: 3
        })
        assert.fail('UnregisteredSchemaError exception not thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        assert.equal(e.message, 'Schema cats is not registered.');
      }
    });

    it('throws a ValidationError if invlaid data is used for a schema', () => {
      client.registerSchema({ name: 'dogs', pk: 'id', schema: DogSchema });

      try {
        client.insert('dogs', {
          id: '1',
          name: 'mittens',
        })
        assert.fail('SchemaValidation exception not thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        assert.equal(e.message, 'child "paws" fails because ["paws" is required]');
      }
    });
  });

  describe('redis client', () => {
    let client = nedis.createClient();
    it('is an instance of redis', () => {
      assert.isTrue(client.getRedisClient() instanceof RedisClient);
    });

    it('has a isConnected method', () => {
      assert.isOk(client.isConnected());
    });
  });

  describe('CRUD', () => {
    // let client: NedisClient;

    beforeEach(() => {
      // client = nedis.createClient();
    });

    xdescribe('insert', () => {
    });

    xdescribe('get all', () => { }

    );

    xdescribe('get by pk', () => { }

    );

    xdescribe('update by pk', () => { }

    );

    xdescribe('delete by pk', () => { }

    );
  });
});
