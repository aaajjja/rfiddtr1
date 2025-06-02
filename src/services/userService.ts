import { doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "../types/index";
import { CACHE } from "./cacheUtils";

// Simulate some users with RFID cards
const simulatedUsers: Record<string, User> = {
  "12345678": { id: "user1", name: "John Doe", cardUID: "12345678", department: "IT" },
  "87654321": { id: "user2", name: "Jane Smith", cardUID: "87654321", department: "HR" },
  "11223344": { id: "user3", name: "Mike Johnson", cardUID: "11223344", department: "Finance" },
};

// Load simulated users into cache, but don't override existing data
export function loadSimulatedUsers() {
  Object.values(simulatedUsers).forEach(user => {
    if (!CACHE.users[user.cardUID]) {
      CACHE.users[user.cardUID] = user;
    }
  });
}

// Function to clear all simulated users from the cache
export function clearSimulatedUsers(): boolean {
  // Get list of simulated user cardUIDs
  const simulatedCardUIDs = Object.keys(simulatedUsers);
  
  // Only remove users that are in the simulatedUsers object
  simulatedCardUIDs.forEach(cardUID => {
    delete CACHE.users[cardUID];
  });
  
  console.log("Cleared all simulated users from cache");
  return true;
}

export async function getUserByCardUID(cardUID: string): Promise<User | null> {
  // First check cache for fast lookup
  if (CACHE.users[cardUID]) {
    return CACHE.users[cardUID];
  }
  
  // If not in cache, check Firebase directly
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("cardUID", "==", cardUID));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data() as User;
      // Update cache with this user
      CACHE.users[cardUID] = userData;
      return userData;
    }
  } catch (error) {
    console.error("Error fetching user from Firebase:", error);
  }
  
  return null;
}

export async function registerNewUser(userData: { 
  name: string; 
  cardUID: string; 
  department?: string; 
}): Promise<{ success: boolean; message: string }> {
  try {
    // Basic validation
    if (!userData.name || !userData.cardUID) {
      return {
        success: false,
        message: "Name and Card UID are required fields."
      };
    }
    
    // Sanitize data by trimming whitespace
    const sanitizedData = {
      name: userData.name.trim(),
      cardUID: userData.cardUID.trim(),
      department: userData.department?.trim()
    };
    
    // 1. Check the cache first for this card
    if (CACHE.users[sanitizedData.cardUID]) {
      return { 
        success: false, 
        message: "This RFID card is already registered to another user in the cache."
      };
    }
    
    // 2. Only if not found in cache, check Firebase directly for this card
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("cardUID", "==", sanitizedData.cardUID));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return { 
          success: false, 
          message: "This RFID card is already registered to another user in the database."
        };
      }
    } catch (fbError) {
      console.error("Firebase query error:", fbError);
      // Continue with registration if Firebase query fails, but warn user
      return {
        success: false,
        message: "Could not verify card UID in the database. Please check your connection and try again."
      };
    }
    
    // Generate a unique ID for the user
    const userId = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Create user object
    const newUser: User = {
      id: userId,
      name: sanitizedData.name,
      cardUID: sanitizedData.cardUID,
      department: sanitizedData.department,
    };
    
    // Save to Firebase to ensure persistence
    try {
      await setDoc(doc(db, "users", userId), newUser);
      console.log("User registered and saved to Firebase:", newUser);
      
      // Update cache only if Firebase save is successful
      CACHE.users[sanitizedData.cardUID] = newUser;
      
      return { 
        success: true, 
        message: `User ${sanitizedData.name} registered successfully.`
      };
    } catch (e) {
      console.error("Failed to save user to Firebase:", e);
      return {
        success: false,
        message: "Failed to save user to the database. Please try again."
      };
    }
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      success: false,
      message: "Failed to register user due to system error."
    };
  }
}

// Function to delete a user
export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get the user document from Firebase
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return {
        success: false,
        message: "User not found."
      };
    }

    const userData = userDoc.data() as User;

    // Delete from Firebase
    await deleteDoc(userRef);

    // Remove from cache
    delete CACHE.users[userData.cardUID];

    return {
      success: true,
      message: `User ${userData.name} deleted successfully.`
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      message: "Failed to delete user due to system error."
    };
  }
}

// Function to edit a user
export async function editUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string }> {
  try {
    // Get the user document from Firebase
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return {
        success: false,
        message: "User not found."
      };
    }

    const currentUser = userDoc.data() as User;

    // Create updated user data
    const updatedUser = {
      ...currentUser,
      ...updates,
      id: currentUser.id // Ensure ID doesn't change
    };

    // Update in Firebase
    await setDoc(userRef, updatedUser);

    // Update cache
    CACHE.users[updatedUser.cardUID] = updatedUser;

    return {
      success: true,
      message: `User ${updatedUser.name} updated successfully.`
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return {
      success: false,
      message: "Failed to update user due to system error."
    };
  }
}

