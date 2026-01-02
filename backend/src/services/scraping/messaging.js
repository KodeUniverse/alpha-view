import redis from 'redis';

export default class Messenger {
    constructor() {
        this.redisClient = null;
    }

    async connect(){
        try{
            this.redisClient = redis.createClient({
            url: process.env.REDIS_URL
        });

        this.redisClient.on('connect', () => {
            console.log('Messenger: Redis client connected.')
        });

        await this.redisClient.connect();

        } catch(error) {
            console.error('Messenger: Redis Client failed to initalized.');
            //throw error;
        }
    }

    /**
     * 
     * @param {string} channel 
     * @param {string | Object} msg
     */
    async send(channel, msg) {
        try {
            console.log(`Messenger: Sending ${msg} on channel: ${channel}..`);
            await this.redisClient.publish(channel, msg);
            console.log(`Messenger: Success`);
        } catch (error) {
            console.error(`Messenger: Failed sending ${msg} on channel ${channel}: ${error.stack}`);
        }
    }
    /**
     * 
     * @param {string | Array<string>} channels 
     */
    async subscribe(channels, onMsg){
        this.redisClient.subscribe(channels, onMsg);
    }

    shutDown() {
        this.redisClient.quit(); // graceful shutdown
    }
}
