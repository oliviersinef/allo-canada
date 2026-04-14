/**
 * ALLO CANADA - Auth Logic with Supabase & Security Improvements
 */

// 1. Unified Supabase Initialization
const SUPABASE_URL_AUTH = "https://cmgzoojrbqpnxmadwkdx.supabase.co";
const SUPABASE_ANON_KEY_AUTH = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZ3pvb2pyYnFwbnhtYWR3a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDAyMjUsImV4cCI6MjA5MTUxNjIyNX0.aqZTo_81TM_9aFEWKtRCZWsRAD33T08ENLtLg0XqdUU";

/**
 * Initialize or retrieve the global Supabase client
 */
export function getSupabase() {
    if (window.supabaseClient) return window.supabaseClient;
    
    if (typeof supabase === 'undefined') {
        console.error("Supabase library not loaded!");
        return null;
    }
    
    window.supabaseClient = supabase.createClient(SUPABASE_URL_AUTH, SUPABASE_ANON_KEY_AUTH);
    return window.supabaseClient;
}

const supabaseClient = getSupabase();

/**
 * Security Service: Brute Force Protection & Sanitization
 */
const AuthSecurity = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes in milliseconds

    // Sanitize input to prevent SQL/XSS injections at the client level
    sanitizeInput: function(input) {
        if (!input) return '';
        // Remove common SQL injection patterns and problematic characters
        return input.toString()
            .replace(/['";\\]/g, '') // Remove quotes, semicolons, backslashes
            .replace(/--/g, '')      // Remove SQL comment markers
            .replace(/(<([^>]+)>)/gi, "") // Remove HTML tags
            .trim();
    },

    getBanState: function(email) {
        const banKey = `auth_ban_${email}`;
        const banData = localStorage.getItem(banKey);
        if (!banData) return null;
        
        const parsed = JSON.parse(banData);
        const now = Date.now();
        
        if (now > parsed.unlockTime) {
            localStorage.removeItem(banKey);
            return null; // Ban expired
        }
        
        return parsed;
    },

    recordFailedAttempt: function(email) {
        const attemptsKey = `auth_attempts_${email}`;
        let attempts = parseInt(localStorage.getItem(attemptsKey) || '0');
        attempts++;
        
        if (attempts >= this.MAX_ATTEMPTS) {
            // Apply ban
            const banData = {
                unlockTime: Date.now() + this.LOCKOUT_DURATION_MS
            };
            localStorage.setItem(`auth_ban_${email}`, JSON.stringify(banData));
            localStorage.removeItem(attemptsKey); // Reset attempts
            return { lockedOut: true, unlockTime: banData.unlockTime };
        } else {
            localStorage.setItem(attemptsKey, attempts.toString());
            return { lockedOut: false, attemptsRemaining: this.MAX_ATTEMPTS - attempts };
        }
    },

    resetAttempts: function(email) {
        localStorage.removeItem(`auth_attempts_${email}`);
        localStorage.removeItem(`auth_ban_${email}`);
    }
};

/**
 * Handle Login
 */
export async function handleLogin(rawEmail, rawPassword) {
    const email = AuthSecurity.sanitizeInput(rawEmail);
    const password = rawPassword; // Don't sanitize password, let Supabase handle it securely
    
    // Check if user is currently banned locally
    const banState = AuthSecurity.getBanState(email);
    if (banState) {
        const remainingMinutes = Math.ceil((banState.unlockTime - Date.now()) / 60000);
        return { 
            success: false, 
            lockedOut: true,
            error: { message: `Sécurité : Compte bloqué suite à trop de tentatives. Réessayez dans ${remainingMinutes} minute(s).` }
        };
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });
    
    if (error) {
        const attemptStatus = AuthSecurity.recordFailedAttempt(email);
        if (attemptStatus.lockedOut) {
            return { 
                success: false, 
                error: { message: `Sécurité : Compte bloqué pour 15 minutes suite à 5 tentatives infructueuses.` }
            };
        } else {
            return { 
                success: false, 
                error: { message: `Email ou mot de passe incorrect. Il vous reste ${attemptStatus.attemptsRemaining} tentative(s).` }
            };
        }
    }
    
    // Success: reset tracking
    AuthSecurity.resetAttempts(email);
    return { success: true, user: data.user };
}

/**
 * Handle Sign Up
 */
export async function handleSignUp(rawEmail, rawPassword, rawFullName, rawCountry, rawPhone) {
    const email = AuthSecurity.sanitizeInput(rawEmail);
    const fullName = AuthSecurity.sanitizeInput(rawFullName);
    const country = AuthSecurity.sanitizeInput(rawCountry);
    const phone = AuthSecurity.sanitizeInput(rawPhone);
    const password = rawPassword;

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                country: country,
                phone: phone
            }
        }
    });

    if (error) return { success: false, error };
    return { success: true, user: data.user };
}

/**
 * Handle Logout
 */
export async function handleLogout() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('allo_canada_sessions');
    localStorage.removeItem('allo_canada_guest_questions');
    window.location.href = 'index.html';
}

/**
 * Get current user
 */
export async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

/**
 * Check if user is logged in
 */
export async function checkAuthStatus() {
    const user = await getCurrentUser();
    return !!user;
}

// Global exports for Vite/Vercel build compatibility
window.handleLogin = handleLogin;
window.handleSignUp = handleSignUp;
window.handleLogout = handleLogout;
window.getCurrentUser = getCurrentUser;
window.checkAuthStatus = checkAuthStatus;
