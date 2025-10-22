// Login functionality
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Simple validation (dalam produksi, gunakan autentikasi yang lebih aman)
    if (username && password) {
        // Simpan data user ke session
        const userData = {
            username: username,
            loginTime: new Date().toISOString()
        };
        
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Redirect ke halaman utama
        window.location.href = 'index.html';
    } else {
        alert('Please fill in all fields! 😊');
    }
});


// Check if user already logged in
window.addEventListener('load', function() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        window.location.href = 'index.html';
    }
});
// Function to toggle between login and register boxes
function toggleBoxes(showId, hideId) {
    document.getElementById(hideId).classList.add('hidden');
    document.getElementById(showId).classList.remove('hidden');
}

document.getElementById('signupLink').addEventListener('click', function(e) {
    e.preventDefault();
    toggleBoxes('registerBox', 'loginBox');
});

document.getElementById('loginLink').addEventListener('click', function(e) {
    e.preventDefault();
    toggleBoxes('loginBox', 'registerBox');
});

// Registration functionality
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('reg-username').value.trim();
    const absen = document.getElementById('reg-absen').value;
    const divisi = document.getElementById('reg-divisi').value.trim();
    const password = document.getElementById('reg-password').value;
    
    // Get existing users or initialize empty array
    let users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Check if username already exists
    if (users.some(user => user.username === username)) {
        alert('Username sudah terdaftar. Coba yang lain! 😔');
        return;
    }
    
    // Create new user object
    const newUser = {
        username: username,
        absen: absen,
        divisi: divisi,
        password: password // In production, hash this password!
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    alert('Pendaftaran berhasil! Silakan login. 🎉');
    toggleBoxes('loginBox', 'registerBox'); // Switch back to login
    document.getElementById('registerForm').reset();
});

// Login functionality
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    let users = JSON.parse(localStorage.getItem('users')) || [];
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Simpan data user yang sudah lengkap ke session
        const userData = {
            username: user.username,
            absen: user.absen,
            divisi: user.divisi,
            loginTime: new Date().toISOString()
        };
        
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Redirect ke halaman utama
        window.location.href = 'index.html';
    } else {
        alert('Username atau Password salah. Coba lagi! 🤔');
    }
});

// Check if user already logged in
window.addEventListener('load', function() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        window.location.href = 'index.html';
    }
});