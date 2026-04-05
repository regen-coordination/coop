import type { WSContext } from 'hono/ws';
import { rawKey } from './ws-utils';

export class TopicRegistry {
  /** topic name -> Map<stable key, WSContext> */
  private topics = new Map<string, Map<object, WSContext>>();

  subscribe(ws: WSContext, topicName: string): void {
    let subscribers = this.topics.get(topicName);
    if (!subscribers) {
      subscribers = new Map();
      this.topics.set(topicName, subscribers);
    }
    subscribers.set(rawKey(ws), ws);
  }

  unsubscribe(ws: WSContext, topicName: string): void {
    const subscribers = this.topics.get(topicName);
    if (!subscribers) return;
    subscribers.delete(rawKey(ws));
    if (subscribers.size === 0) {
      this.topics.delete(topicName);
    }
  }

  getSubscribers(topicName: string): Iterable<WSContext> | undefined {
    const subscribers = this.topics.get(topicName);
    return subscribers ? subscribers.values() : undefined;
  }

  getSubscriberCount(topicName: string): number {
    return this.topics.get(topicName)?.size ?? 0;
  }

  removeAll(ws: WSContext, subscribedTopics: Set<string>): void {
    const key = rawKey(ws);
    for (const topicName of subscribedTopics) {
      const subscribers = this.topics.get(topicName);
      if (!subscribers) continue;
      subscribers.delete(key);
      if (subscribers.size === 0) {
        this.topics.delete(topicName);
      }
    }
    subscribedTopics.clear();
  }
}
