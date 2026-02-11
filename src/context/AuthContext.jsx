import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUserDoc = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);

                // Real-time listener for Role
                // This fixes the race condition where Signup creates Auth User -> onAuthStateChanged fires -> Roles doc created LATER.
                // With onSnapshot, we will get the update as soon as the doc is created.
                unsubscribeUserDoc = onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
                    console.log("AuthContext: User Doc/Role Update", docSnapshot.data());
                    if (docSnapshot.exists()) {
                        setUserRole(docSnapshot.data().role);
                    } else {
                        // Doc might not exist YET during signup flow. 
                        // We don't set null immediately if we want to wait, but setting null is safe as it will update again when created.
                        console.log("User doc not found (yet). Waiting for creation...");
                        setUserRole(null);
                    }
                    setLoading(false); // Only set loading false after we checked the doc
                }, (error) => {
                    console.error("Error fetching user role:", error);
                    setUserRole(null);
                    setLoading(false);
                });

            } else {
                setCurrentUser(null);
                setUserRole(null);
                if (unsubscribeUserDoc) unsubscribeUserDoc();
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) unsubscribeUserDoc();
        };
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = (email, password) => {
        console.log("Attempting Signup:", { email, passwordLength: password?.length });
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        currentUser,
        userRole,
        login,
        signup,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
