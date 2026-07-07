import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { firebaseConfig, databaseName } from './test-firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, databaseName);

async function test() {
  try {
    console.log("Adding doc...");
    await addDoc(collection(db, "test_collection"), { test: "hello" });
    console.log("Added doc.");
    console.log("Reading docs...");
    const snapshot = await getDocs(collection(db, "test_collection"));
    console.log("Docs:", snapshot.docs.length);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

test();
