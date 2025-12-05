// IndexedDB helper for community messages
const DB_NAME = 'CozyTribeDB';
const DB_VERSION = 1;
const MESSAGES_STORE = 'community_messages';

export interface CommunityMessage {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  synced?: boolean; // Track if message is synced to Supabase
}

class MessageDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          store.createIndex('community_id', 'community_id', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  async addMessage(message: CommunityMessage): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.add(message);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMessages(communityId: string): Promise<CommunityMessage[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('community_id');
      const request = index.getAll(IDBKeyRange.only(communityId));

      request.onsuccess = () => {
        const messages = request.result.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedMessages(communityId: string): Promise<CommunityMessage[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const unsynced = request.result.filter(
          msg => msg.community_id === communityId && !msg.synced
        );
        resolve(unsynced);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(messageIds: string[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);

      let completed = 0;
      messageIds.forEach(id => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const message = getRequest.result;
          if (message) {
            message.synced = true;
            store.put(message);
          }
          completed++;
          if (completed === messageIds.length) resolve();
        };
      });

      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearMessages(communityId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('community_id');
      const request = index.openCursor(IDBKeyRange.only(communityId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const messageDB = new MessageDB();
