import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase with Custom Database ID
const app = initializeApp(firebaseConfig);

// Initialize Firestore specifying database ID as the second argument
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "default");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection to Firestore
export async function testFirestoreConnection() {
  try {
    const testDocRef = doc(db, "test", "connection");
    await getDocFromServer(testDocRef);
    console.log("Successfully verified Firestore server connection!");
  } catch (error: any) {
    if (error?.message?.includes("offline")) {
      console.error("Please check your firebase deployment configuration - current client is offline.");
    } else {
      console.log("Firestore connection check completed. Normal operation.", error);
    }
  }
}
