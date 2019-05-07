import { AssertionError } from 'assert';
import { assert } from 'chai';
import * as Redis from 'ioredis';
import * as Joi from 'joi';
import nedis, { NedisClient } from '../src/nedis';
import { SchemaDefinition } from '../src/types';

const UserSchema = Joi.object().keys({
  id: Joi.string().required(),
  name: Joi.string().required(),
  age: Joi.number().required()
});

const userSchema: SchemaDefinition = { name: 'users', pk: 'id', schema: UserSchema };

const DogSchema = Joi.object().keys({
  id: Joi.string().required(),
  name: Joi.string().required(),
  paws: Joi.number().required()
});

const dogSchema: SchemaDefinition = { name: 'dogs', pk: 'id', schema: DogSchema };

// tslint:disable-next-line: max-func-body-length
describe('nedis', () => {

  it('is a lib', () => {
    assert.isObject(nedis);
  });

  describe('configuration', () => {
    it('has defaults', async () => {
      const client = await nedis.createClient();
      assert.equal(client.config.host, 'localhost');
      assert.equal(client.config.port, 6379);
    });

    xit('accepts a single override', async () => {
      let client;
      try {
        client = await nedis.createClient({ host: 'glubulhust' });
      } catch (err) {
        // ignore connection error
      }
      assert.equal(client.config.host, 'glubulhust');
      assert.equal(client.config.port, 6379);
    });

    xit('accepts multiple overrides', async () => {
      const client = await nedis.createClient({ host: 'glubulhust', port: 1234 });
      assert.equal(client.config.host, 'glubulhust');
      assert.equal(client.config.port, 1234);
    });

    it('has defaults when empty object is passed', async () => {
      const client = await nedis.createClient({});
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
      client.registerSchema(userSchema);
      client.registerSchema(dogSchema);
      assert.include(client.getRegisteredSchemas(), userSchema);
      assert.include(client.getRegisteredSchemas(), dogSchema);
    });

    it('multiple schemas can be registered', () => {
      client.registerSchemas([userSchema, dogSchema]);
    });

    it('throw a DuplicateSchemaError when registering a non unique schema name', () => {
      client.registerSchemas([userSchema, dogSchema]);

      try {
        client.registerSchema(userSchema);
        assert.fail('DuplicateSchema exception not thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        assert.equal(e.message, '"users" schema is already registered.');
      }
    });

    it('throw a DuplicateSchemaError when registering non unique multiple schemas', () => {
      client.registerSchemas([userSchema, dogSchema]);

      try {
        client.registerSchemas([userSchema, dogSchema]);
        assert.fail('DuplicateSchema exception not thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        assert.equal(e.message, '"users" schema is already registered.');
      }
    });

    xit('why does this work', () => {
      const userSchemaReg = { name: 'users', pk: 'id', schema: UserSchema, notAllowed: 'hello' };
      client.registerSchema(userSchemaReg);
      assert.include(client.getRegisteredSchemas(), userSchemaReg);
    });
  });

  describe('validation', () => {
    let client: NedisClient;

    beforeEach(async () => {
      client = await nedis.createClient();
    });

    it('throws a UnregisteredSchemaError if a unregistered schema is referenced', async () => {
      try {
        await client.insert('cats', {
          id: '1',
          name: 'mittens',
          paws: 3
        });
        assert.fail('UnregisteredSchemaError exception not thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        assert.equal(e.message, 'Schema "cats" is not registered.');
      }
    });

    it('throws a ValidationError if invlaid data is used for a schema', async () => {
      client.registerSchema({ name: 'dogs', pk: 'id', schema: DogSchema });

      try {
        await client.insert('dogs', {
          id: '1',
          name: 'mittens'
        });
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
    it('is an instance of redis', async () => {
      const client = await nedis.createClient();
      assert.isTrue(client.getRedisClient() instanceof Redis);
    });

    it('handles no connection', async () => {
      try {
        const client = nedis.createClient({ port: 1234 });
        await client.insert('users', { id: '1', name: 'andrew', age: '13' });
        assert.fail('ConnectionError exception not thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        assert.equal(e.message, 'Connection Error: Could not connect to redis at localhost:1234');
      }
    });
  });

  // tslint:disable-next-line: max-func-body-length
  describe('CRUD', () => {
    const redis = new Redis();
    let client: NedisClient;

    beforeEach(async () => {
      client = await nedis.createClient();
      client.registerSchemas([userSchema]);

    });

    afterEach(() => {
      ['users', 'users:1', 'users:2'].map(k => redis.del(k));
    });

    describe('insert', () => {
      it('creates an item', async () => {
        const data = { id: '1', name: 'andy', age: '4' };
        const result = await client.insert('users', data);
        assert.isTrue(result);
        assert.isOk(await redis.exists('users:1'));
        assert.deepEqual(data, await redis.hgetall('users:1'));
      });

      it('creates an item and adds it to the index if the index doesnt exist', async () => {
        const data = { id: '1', name: 'andy', age: '4' };
        const result = await client.insert('users', data);
        assert.isTrue(result);
        assert.isOk(await redis.exists('users:1'));
        assert.deepEqual(data, await redis.hgetall('users:1'));
        assert.include(await client.lmembers('users'), 'users:1');
      });

      it('creates an item and adds it to the index if the index does exist', async () => {
        await redis.rpush('users', 'testkey');
        const data = { id: '1', name: 'andy', age: '4' };
        const result = await client.insert('users', data);
        assert.isTrue(result);
        assert.isOk(await redis.exists('users:1'));
        assert.deepEqual(data, await redis.hgetall('users:1'));
        assert.include(await client.lmembers('users'), 'users:1');
      });

      it('doesnt create an item if they key exists', async () => {
        await redis.set('users:1', 'blah');
        const data = { id: '1', name: 'andy', age: '4' };
        try {
          await client.insert('users', data);
          assert.fail('ItemAlreadyExistsError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, 'Item with key "users:1" already exists.');
        }
        const user = await redis.get('users:1');
        assert.equal('blah', user);
      });

      it('doesnt create an item if they key exists in the table set', async () => {
        await redis.rpush('users', 'users:1');
        const data = { id: '1', name: 'andy', age: '4' };
        try {
          await client.insert('users', data);
          assert.fail('DatabaseInsertError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, 'Error inserting into key "users:1". Error: Key doesnt exist but key is in table set.');
        }

        const user = await redis.exists('users:1');
        assert.notOk(user);
      });

      it('throws a ValidationError and doesnt create an item if data is invalid', async () => {
        const data = { id: '1', name: 'andy', age: '10', paws: '4' };
        try {
          await client.insert('users', data);
          assert.fail('ValidationError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, '"paws" is not allowed');
        }

        const user = await redis.exists('users:1');
        assert.notOk(user);
      });
    });

    describe('get all', () => {
      it('returns all populated items', async () => {
        const andrew = { id: '1', name: 'andrew', age: '13' };
        const david = { id: '2', name: 'david', age: '10' };
        await client.insert('users', andrew);
        await client.insert('users', david);
        const results = await client.getAll('users');
        assert.deepEqual(results, [andrew, david]);
      });

      it('returns an empty array if there are no items', async () => {
        const results = await client.getAll('users');
        assert.isArray(results);
        assert.isEmpty(results);
      });

      it('throws an UnregisteredSchemaError if called with an unregistered schema', async () => {
        try {
          await client.getAll('dogs');
          assert.fail('UnregisteredSchemaError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, 'Schema "dogs" is not registered.');
        }
      });
    });

    describe('get by pk', () => {
      it('returns a single item by pk', async () => {
        const andrew = { id: '1', name: 'andrew', age: '13' };
        const david = { id: '2', name: 'david', age: '10' };
        await client.insert('users', andrew);
        await client.insert('users', david);
        const andrewQuery = await client.get('users', '1');
        assert.deepEqual(andrewQuery, andrew);
        const davidQuery = await client.get('users', '2');
        assert.deepEqual(davidQuery, david);
      });

      it('throws an ItemNotFoundError when missing', async () => {
        try {
          await client.get('users', 'doggo');
          assert.fail('ItemNotFoundError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, '"users" item by primary key "doggo" does not exist.');
        }
      });

      it('throws a UnregisteredSchemaError if called with an unregistered schema', async () => {
        try {
          await client.get('dogs', '40');
          assert.fail('UnregisteredSchemaError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, 'Schema "dogs" is not registered.');
        }
      });
    });

    describe('update by pk', () => {
      it('updates a single item by pk', async () => {
        const andrew = { id: '1', name: 'blaney', age: '10' };
        await client.insert('users', andrew);
        const updatedAndrew = { name: 'blaney', age: '5' };
        const updatedResult = await client.update('users', '1', updatedAndrew);

        assert.deepEqual(updatedResult, { id: '1', name: 'blaney', age: '5' });
        assert.deepEqual(await redis.hgetall('users:1'), { id: '1', name: 'blaney', age: '5' });
      });

      it('should throw a ItemNotFoundError when trying to update a non-existant item', async () => {
        const andrew = { id: '1', name: 'blaney', age: '10' };
        await client.insert('users', andrew);

        try {
          await client.update('users', '100', { name: 'andy' });
          assert.fail('ItemNotFoundError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, '"users" item by primary key "100" does not exist.');
          assert.isEmpty(redis.get('users:100'));
        }
      });

      it('should throw a Validation error when trying to update the pk', async () => {
        const andrew = { id: '1', name: 'blaney', age: '10' };
        await client.insert('users', andrew);

        try {
          await client.update('users', '100', { name: 'andy' });
          assert.fail('ItemNotFoundError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, '"users" item by primary key "100" does not exist.');
          assert.isEmpty(redis.get('users:100'));
        }
      });
    });

    describe('delete by pk', () => {
      it('deletes a single item by pk', async () => {
        await client.insert('users', { id: '1', name: 'andrew', age: '13' });
        const david = { id: '2', name: 'david', age: '10' };
        await client.insert('users', david);
        const all = await client.getAll('users');
        assert.equal(all.length, 2);
        await client.delete('users', '1');
        const allAfterDelete = await client.getAll('users');
        assert.equal(allAfterDelete.length, 1);
        assert.deepEqual(allAfterDelete, [david]);
      });

      it('should throw a ItemNotFoundError when trying to delete a non-existant item', async () => {
        const andrew = { id: '1', name: 'blaney', age: '10' };
        await client.insert('users', andrew);

        try {
          await client.delete('users', '100');
          assert.fail('ItemNotFoundError exception not thrown');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          assert.equal(e.message, '"users" item by primary key "100" does not exist.');
          assert.isEmpty(redis.get('users:100'));
        }
      });
    });
  });
});

/*
Todo:
- either make test DB or stub calling ioredis.
- insert multiple
- sort out return types for actions.. can you create a type from a joi schema for intellisense?
- add pagination to getAll
- add logger to config
- work out bhow to test config overriding for vars that make bad
*/
