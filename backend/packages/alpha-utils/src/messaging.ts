import redis, { RedisArgument, RedisClientType } from "redis";

export default class Messenger {
  private redisClient: RedisClientType | null;

  constructor() {
    this.redisClient = null;
  }

  async connect() {
    try {
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL,
      });

      this.redisClient.on("connect", () => {
        console.log("Messenger: Redis client connected.");
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error("Messenger: Redis Client failed to initalized.");
    }
  }
  /**
   *
   * @param {string} channel
   * @param {string | Object} msg
   */
  async send(channel: string, msg: RedisArgument) {
    try {
      if (!this.redisClient)
        throw new Error(
          "Redis client not connected. Please connect first before sending a message.",
        );
      console.log(`Messenger: Sending ${msg} on channel: ${channel}..`);
      await this.redisClient!.publish(channel, msg);
      console.log(`Messenger: Success`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.stack : String(error);
      console.error(
        `Messenger: Failed sending ${msg} on channel ${channel}: ${errorMsg}`,
      );
    }
  }
  /**
   *
   * @param {string | Array<string>} channels
   */
  async subscribe(
    channels: string | string[],
    onMsg: (message: string, channel: string) => void,
  ) {
    if (!this.redisClient)
      throw new Error(
        "Redis client not connected! Please connect first before subscribing.",
      );
    this.redisClient.subscribe(channels, onMsg);
  }

  shutDown() {
    if (!this.redisClient)
      throw new Error("Redis client not connected, nothing to shut down.");
    this.redisClient.quit(); // graceful shutdown
  }
}
