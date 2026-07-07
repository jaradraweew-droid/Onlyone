import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, setDoc, doc } from 'firebase/firestore';
import { firebaseConfig, databaseName } from './test-firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, databaseName);

async function test() {
  try {
    const pairId = "test_A_B";
    const messagesRef = collection(db, "chats", pairId, "messages");
    
    console.log("Writing message...");
    await setDoc(doc(messagesRef, "msg1"), { text: "hello", timestamp: Date.now() });
    console.log("Reading messages...");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
    const snapshot = await getDocs(q);
    console.log("Docs:", snapshot.docs.length);
    snapshot.forEach(docSnap => console.log(docSnap.data()));
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

test();
