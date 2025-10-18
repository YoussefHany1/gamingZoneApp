import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase.js";

// fetch rss urls from firestore
const docRef = collection(db, "rss");
console.log("Listening to Firestore document...");
let rssFeeds = [];

onSnapshot(
  docRef,
  (snap) => {
    if (snap) {
      rssFeeds = [];
      snap.docs.forEach((doc) => {
        const data = doc.data();
        rssFeeds = { ...rssFeeds, ...data };
      });
      console.log("✅ Current data: ", rssFeeds?.[news]);
      // rssFeeds.find((item) => console.log(item.news));
    } else {
      console.log("❌ Document does not exist.");
    }
  },
  (err) => {
    console.error("🚨 Error while fetching Firestore document:", err);
  }
);
