import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { BookkeepingEntry, StockItem } from "./types";

// Firebase Collections
const ENTRIES_COLLECTION = "bookkeeping_entries";
const STOCK_COLLECTION = "stock_items";

/**
 * Real-time listener for bookkeeping ledger entries
 */
export function subscribeBookkeepingEntries(onUpdate: (entries: BookkeepingEntry[]) => void) {
  const q = query(
    collection(db, ENTRIES_COLLECTION),
    orderBy("timestamp", "desc")
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      const entries: BookkeepingEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          timestamp: data.timestamp || new Date().toISOString(),
          rawText: data.rawText || "",
          type: data.type || "income",
          amount: Number(data.amount) || 0,
          category: data.category || "Other",
          description: data.description || "",
          items: data.items || [],
        });
      });
      onUpdate(entries);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, ENTRIES_COLLECTION);
    }
  );
}

/**
 * Real-time listener for stock inventory items
 */
export function subscribeStockItems(onUpdate: (items: StockItem[]) => void) {
  const q = query(
    collection(db, STOCK_COLLECTION),
    orderBy("name", "asc")
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StockItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          name: data.name || "",
          currentStock: Number(data.currentStock) || 0,
          minStockAlert: Number(data.minStockAlert) || 0,
          burnRate: Number(data.burnRate) || 0,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        });
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, STOCK_COLLECTION);
    }
  );
}

/**
 * Log a parsed bookkeeping entry to firestore
 */
export async function saveBookkeepingEntry(entry: Omit<BookkeepingEntry, "id">) {
  try {
    const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), entry);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ENTRIES_COLLECTION);
  }
}

/**
 * Register or update stock item in firestore
 */
export async function saveStockItem(item: Omit<StockItem, "id"> & { id?: string }) {
  const id = item.id || item.name.toLowerCase().replace(/[^a-z0-9]/g, "-") || Math.random().toString(36).substring(2);
  const path = `${STOCK_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, STOCK_COLLECTION, id);
    await setDoc(docRef, { ...item, id }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Remove bookkeeping entry from ledger
 */
export async function deleteBookkeepingEntry(id: string) {
  const path = `${ENTRIES_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, ENTRIES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Remove stock item from inventory
 */
export async function deleteStockItem(id: string) {
  const path = `${STOCK_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, STOCK_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
