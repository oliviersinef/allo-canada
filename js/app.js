/* ALLO CANADA - Main Application Logic */
import { checkAuthStatus, getSupabase } from './auth.js';

const supabase = getSupabase();


document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle logic
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            const isActive = navLinks.classList.toggle('active');
            document.body.style.overflow = isActive ? 'hidden' : 'auto';
        });

        // Close menu when clicking a link
        document.querySelectorAll('.nav-link, .btn-primary').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }

    // Scroll effect for Navbar
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 20) {
            navbar.style.boxShadow = 'var(--shadow-lg)';
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        } else {
            navbar.style.boxShadow = 'none';
            navbar.style.background = 'rgba(255, 255, 255, 0.85)';
        }
    });

    // Initialize animations for elements already in view
    document.querySelectorAll('[data-animate]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
            el.classList.add('visible');
        }
    });

    // Check Auth Status for the navbar button
    async function updateNavbarAuth() {
        const authBtnLink = document.getElementById('auth-btn-link');
        if (authBtnLink && typeof checkAuthStatus === 'function') {
            const isLoggedIn = await checkAuthStatus();
            if (isLoggedIn) {
                authBtnLink.textContent = 'Mon Espace';
                authBtnLink.href = 'chat.html';
            }
        }
    }
    // --- Realtime Presence ---
    async function initPresence() {
        const channel = supabase.channel('online-users');
        await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                const { data: { user } } = await supabase.auth.getUser();
                await channel.track({
                    user_id: user?.id || 'guest',
                    online_at: new Date().toISOString(),
                });
            }
        });
    }
    initPresence();
});
