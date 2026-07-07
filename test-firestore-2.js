import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { firebaseConfig, databaseName } from './test-firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, databaseName);

async function test() {
  try {
    const q = query(collection(db, "test_collection"), orderBy("timestamp", "asc"), limit(100));
    const snapshot = await getDocs(q);
    console.log("Docs:", snapshot.docs.length);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

test();
