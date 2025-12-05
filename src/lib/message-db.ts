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
      // Use put() instead of add() to handle duplicates gracefully
      const request = store.put(message);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addMessages(messages: CommunityMessage[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);

      let completed = 0;
      let hasError = false;

      messages.forEach(message => {
        // Use put() instead of add() to handle duplicates gracefully
        const request = store.put(message);

        request.onsuccess = () => {
          completed++;
          if (completed === messages.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });

      // Handle empty array case
      if (messages.length === 0) {
        resolve();
      }

      transaction.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(transaction.error);
        }
      };
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

  // Reconcile messages: fetch from server and merge with local IndexedDB
  async reconcileMessages(communityId: string, serverMessages: CommunityMessage[]): Promise<CommunityMessage[]> {
    if (!this.db) await this.init();

    // Get existing local messages
    const localMessages = await this.getMessages(communityId);
    const localIds = new Set(localMessages.map(m => m.id));

    // Find messages in server that are not in local
    const missingMessages = serverMessages.filter(msg => !localIds.has(msg.id));

    if (missingMessages.length > 0) {
      console.log(`🔄 Reconciling ${missingMessages.length} missing messages to IndexedDB`);
      // Add missing messages to IndexedDB
      await this.addMessages(missingMessages.map(msg => ({ ...msg, synced: true })));
    }

    // Return all messages sorted by creation time
    const allMessages = [...localMessages, ...missingMessages].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return allMessages;
  }

  // Get message IDs for a community
  async getMessageIds(communityId: string): Promise<Set<string>> {
    const messages = await this.getMessages(communityId);
    return new Set(messages.map(m => m.id));
  }
}

export const messageDB = new MessageDB();
