import * as Redis from 'ioredis';
import * as Joi from 'joi';
import nedis, { NedisClient } from './nedis';

const DogSchema = Joi.object().keys({
    id: Joi.string().required(),
    name: Joi.string().required(),
    paws: Joi.number().required()
});

class API {
    client: NedisClient;
    redis: Redis.Redis;
    logging: boolean;

    constructor(logging: boolean = true) {
        this.redis = new Redis();
        this.logging = logging;
    }

    public cleanUp() {
        const keys = [
            'dogs',
            'dogs:1',
            'dogs:2',
            'dogs:3'
        ];

        keys.map(k => this.redis.del(k));
    }

    public async demo() {
        try {
            let dogs;

            const client = await nedis.createClient();
            client.registerSchema({ name: 'dogs', pk: 'id', schema: DogSchema });
            this.log('"dogs" schema registered');

            const ralph = await client.insert('dogs', { id: '1', name: 'ralph', paws: '4' });
            const jessey = await client.insert('dogs', { id: '2', name: 'jessey', paws: '3' });
            const barry = await client.insert('dogs', { id: '3', name: 'barry', paws: '6' });
            this.log(`Ralph inserted: ${ralph}. Jessey inserted: ${jessey}. Barry inserted: ${barry}.`);

            dogs = await client.getAll('dogs');
            this.log('All dogs:', dogs);

            const updatedRalph = await client.update('dogs', '1', { paws: '2' });
            this.log('Post op ralph:', updatedRalph);

            dogs = await client.getAll('dogs');
            this.log('All dogs:', dogs);

            const deleteRalph = await client.delete('dogs', '1');
            this.log(`Ralphs deleted: ${deleteRalph}\n`);
            dogs = await client.getAll('dogs');
            this.log('All dogs:', dogs);
            this.cleanUp();
        } catch (err) {
            console.error(err);
        } finally {
            this.cleanUp();
            process.exit();
        }
    }

    private log(...args: any[]) {
        if (this.logging) { args.map(a => console.log('\n', a)); }
    }
}

(async () => {
    const api = new API();
    await api.demo();
})();
