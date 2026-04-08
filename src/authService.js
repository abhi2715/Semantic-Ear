/**
 * Simulated backend authentication service using localStorage.
 * This stores users securely in the browser to act as a 0-setup backend.
 */

const USERS_KEY = 'semantic_ear_users';
const SESSION_KEY = 'semantic_ear_session';

// Helper to get all users
const getUsers = () => {
    try {
        const data = localStorage.getItem(USERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

// Helper to save all users
const saveUsers = (users) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

/**
 * Sign up a new user
 */
export const signUp = (name, email, password) => {
    const users = getUsers();

    // Check if user already exists
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists.');
    }

    const newUser = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password, // In a real app, this would be hashed!
        createdAt: Date.now()
    };

    users.push(newUser);
    saveUsers(users);

    // Auto-login after signup
    const sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    return sessionUser;
};

/**
 * Log in an existing user
 */
export const login = (email, password) => {
    const users = getUsers();
    const user = users.find(u =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password
    );

    if (!user) {
        throw new Error('Invalid email or password.');
    }

    const sessionUser = { id: user.id, name: user.name, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    return sessionUser;
};

/**
 * Log out the current user
 */
export const logout = () => {
    localStorage.removeItem(SESSION_KEY);
};

/**
 * Get the currently logged-in user session
 */
export const getCurrentUser = () => {
    try {
        const session = localStorage.getItem(SESSION_KEY);
        return session ? JSON.parse(session) : null;
    } catch {
        return null;
    }
};
