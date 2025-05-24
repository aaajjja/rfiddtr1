// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const fetchData = async () => {
  const querySnapshot = await getDocs(collection(db, "users"));
  querySnapshot.forEach((doc) => {
    console.log(doc.id, "=>", doc.data());
  });
};

const firebaseConfig = {
  apiKey: "AIzaSyCpdlnBWRFvBWiz1Zdj20E9a_tcQir1OEg",
  authDomain: "dtr-test-6abcb.firebaseapp.com",
  projectId: "dtr-test-6abcb",
  storageBucket: "dtr-test-6abcb.firebasestorage.app",
  messagingSenderId: "487340785463",
  appId: "1:487340785463:web:438209656c8425f20ce4b2",
  measurementId: "G-XNCB7EZS04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);