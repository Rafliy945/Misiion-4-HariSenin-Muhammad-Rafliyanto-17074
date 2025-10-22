// Global array to store tasks (hanya tugas yang melibatkan user yang sedang login)
let tasks = [];
let currentUsername = null; 
let allUsers = []; // NEW: Global variable to store all registered users

// Check if user is logged in
window.addEventListener('load', function() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const userData = JSON.parse(currentUser);
    currentUsername = userData.username; // Ambil username user yang login
    
    // NEW: Load all users for the assignees list
    allUsers = JSON.parse(localStorage.getItem('users')) || [];
    
    displayUserInfo(userData);
    loadTasks();
    updateTime();
    populateAssigneesSelect(); // NEW: Populate the select box
    
    // Set intervals for real-time updates
    setInterval(updateTime, 1000);
    checkDeadlines();
    setInterval(checkDeadlines, 60000); // Check every minute
    
    // Request permission for device notifications
    requestNotificationPermission();
});


// NEW FUNCTION: Populate the Assignees Select Box
function populateAssigneesSelect() {
    const select = document.getElementById('taskAssignees');
    if (!select) return;

    select.innerHTML = ''; // Clear existing options
    
    // Filter user yang sedang login dari daftar pilihan
    const otherUsers = allUsers.filter(user => user.username !== currentUsername);

    // Tambahkan opsi untuk user lain
    otherUsers.forEach(user => {
        const option = document.createElement('option');
        // Tampilkan username dan divisinya
        option.value = user.username;
        option.textContent = `${user.username} (${user.divisi})`; 
        select.appendChild(option);
    });

    // Opsi untuk menugaskan ke diri sendiri (default)
    const selfOption = document.createElement('option');
    selfOption.value = currentUsername;
    selfOption.textContent = `${currentUsername} (Saya)`;
    selfOption.selected = true; // Set default to self
    select.appendChild(selfOption);
}


// Display user information
function displayUserInfo(userData) {
    const userName = userData.username;
    
    // Tampilkan di Header dan Profile Name
    document.getElementById('userName').textContent = userName;
    document.getElementById('profileName').textContent = userName;
    document.getElementById('userInitial').textContent = userName.charAt(0).toUpperCase();
    
    // Memasukkan data Absen dan Divisi (Menggunakan elemen dari index.html yang sudah ada)
    const profileAbsenEl = document.getElementById('profileAbsen');
    const profileDivisiEl = document.getElementById('profileDivisi');

    if (profileAbsenEl) {
        profileAbsenEl.textContent = userData.absen || '-';
    }
    if (profileDivisiEl) {
        profileDivisiEl.textContent = userData.divisi || 'N/A';
    }
}

// Update current time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const dateString = now.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
}

// ===================================
// TASK MANAGEMENT CORE LOGIC - MULTI-USER
// ===================================

// Load tasks from localStorage, FILTERING by current user involvement
function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    const allTasks = storedTasks ? JSON.parse(storedTasks) : [];
    
    // FILTER: Hanya ambil tugas di mana user saat ini adalah pembuat ATAU ditugaskan
    tasks = allTasks.filter(task => 
        task.createdBy === currentUsername || 
        (Array.isArray(task.assignedTo) && task.assignedTo.includes(currentUsername))
    );
    
    renderTasks();
}

// Save tasks to localStorage, MERGING with other users' tasks
function saveTasks() {
    // 1. Ambil semua tugas (termasuk tugas user lain) dari localStorage
    const allStoredTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    // 2. Kumpulkan ID tugas yang telah dimuat/dimodifikasi oleh user saat ini
    const currentUserTaskIds = tasks.map(t => t.id);

    // 3. Filter tugas yang TIDAK ADA di array 'tasks' user saat ini.
    const otherUsersTasks = allStoredTasks.filter(task => {
        return !currentUserTaskIds.includes(task.id);
    });
    
    // 4. Gabungkan tugas user lain dengan tugas user saat ini (yang sudah dimodifikasi)
    const updatedAllTasks = [...otherUsersTasks, ...tasks];

    // 5. Simpan kembali ke localStorage
    localStorage.setItem('tasks', JSON.stringify(updatedAllTasks));
    renderTasks();
}

// Task Form Submission
document.getElementById('taskForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const text = document.getElementById('taskText').value.trim();
    const date = document.getElementById('taskDate').value;
    const time = document.getElementById('taskTime').value;
    const priority = document.getElementById('taskPriority').value;
    
    // NEW: Ambil anggota yang ditugaskan (nilai multiple select)
    const assigneesSelect = document.getElementById('taskAssignees');
    const selectedAssignees = Array.from(assigneesSelect.selectedOptions).map(option => option.value); 

    if (text === "" || selectedAssignees.length === 0) {
        showNotification('Tugas tidak boleh kosong dan harus ditugaskan ke minimal 1 anggota!', 'warning');
        return;
    }
    
    const newTask = {
        id: Date.now(),
        text: text,
        date: date,
        time: time,
        priority: priority,
        completed: false,
        createdAt: new Date().toISOString(),
        // PROPERTI KUNCI BARU
        createdBy: currentUsername, // User pembuat tugas
        assignedTo: selectedAssignees // Array user yang ditugaskan
    };
    
    tasks.push(newTask);
    saveTasks();
    showNotification('Tugas baru berhasil ditambahkan! ✨', 'success');
    
    document.getElementById('taskForm').reset();
    populateAssigneesSelect(); // Muat ulang pilihan
});

// Toggle task completion
function toggleTask(taskId) {
    const id = parseInt(taskId); 
    const task = tasks.find(t => t.id === id);

    // Izin: Hanya user yang ditugaskan atau pembuat yang boleh centang
    const isCreator = task.createdBy === currentUsername;
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.includes(currentUsername);

    if (task && (isCreator || isAssigned)) {
        task.completed = !task.completed;
        saveTasks(); 
        showNotification('Status tugas diperbarui.', 'info');
    } else if (task) {
        showNotification('Anda tidak memiliki izin untuk mengubah status tugas ini. 🚫', 'urgent');
    }
}

// Delete single task
function deleteTask(taskId) {
    const id = parseInt(taskId); 
    const taskToDelete = tasks.find(t => t.id === id);

    // Izin: Hanya pembuat tugas yang boleh menghapus
    if (taskToDelete && taskToDelete.createdBy !== currentUsername) {
        showNotification('Anda hanya bisa menghapus tugas yang Anda buat! 🚫', 'urgent');
        return;
    }

    if (confirm('Yakin mau hapus tugas ini? 🤔')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks(); 
        showNotification('Tugas berhasil dihapus! ✅', 'success');
    }
}

// Delete all tasks
document.getElementById('deleteAllBtn').addEventListener('click', function() {
    if (tasks.length === 0) {
        showNotification('Tidak ada tugas untuk dihapus! 📝', 'info');
        return;
    }

    // Hanya hapus tugas yang dibuat oleh user ini
    const tasksToDelete = tasks.filter(t => t.createdBy === currentUsername);
    if (tasksToDelete.length === 0) {
        showNotification('Anda hanya bisa menghapus tugas yang Anda buat! 🚫', 'urgent');
        return;
    }

    if (confirm(`Yakin mau hapus ${tasksToDelete.length} tugas yang Anda buat? Ini tidak bisa dibatalkan! 😱`)) {
        tasks = tasks.filter(t => t.createdBy !== currentUsername); // Hapus hanya tugas yang dibuat user ini
        saveTasks(); // Simpan perubahan, otomatis menghapus tugas ini dari localStorage
        showNotification('Semua tugas buatan Anda berhasil dihapus! 🗑️', 'success');
    }
});


// ===================================
// RENDERING & UI LOGIC
// ===================================

function renderTasks() {
    const todoList = document.getElementById('todoList');
    const doneList = document.getElementById('doneList');
    
    todoList.innerHTML = '';
    doneList.innerHTML = '';
    
    let todoCount = 0;
    let doneCount = 0;
    
    // Sort tasks: Prioritaskan berdasarkan deadline terdekat untuk To Do
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        if (!a.completed) {
            const deadlineA = new Date(`${a.date}T${a.time}`);
            const deadlineB = new Date(`${b.date}T${b.time}`);
            return deadlineA - deadlineB;
        }
        return 0;
    });

    
    sortedTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        
        if (task.completed) {
            doneList.appendChild(taskElement);
            doneCount++;
        } else {
            todoList.appendChild(taskElement);
            todoCount++;
        }
    });
    
    document.getElementById('todoCount').textContent = todoCount;
    document.getElementById('doneCount').textContent = doneCount;
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    
    let urgentClass = '';
    const deadline = new Date(`${task.date}T${task.time}`);
    const now = new Date();
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
    
    const isOverdue = hoursUntilDeadline < 0 && !task.completed;
    const isUrgent = hoursUntilDeadline <= 24 && hoursUntilDeadline > 0 && !task.completed;
    
    if (isOverdue) urgentClass = 'overdue';
    else if (isUrgent) urgentClass = 'urgent-24h';

    taskDiv.className = `task-item ${task.priority} ${task.completed ? 'done-task' : ''} ${urgentClass}`;
    
    const deadlineText = formatDeadline(deadline);
    const priorityText = {
        'low': 'Low 🟢',
        'medium': 'Medium 🟡',
        'high': 'High 🔴'
    };
    
    // Logic untuk tampilan multi-user dan izin
    const isCreator = task.createdBy === currentUsername;
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.includes(currentUsername);
    
    const canToggle = isCreator || isAssigned; 
    const canDelete = isCreator; // Hanya pembuat yang boleh menghapus
    
    // Tampilkan daftar anggota yang ditugaskan
    const assigneesText = Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : task.assignedTo;
    
    // Tampilkan siapa pembuatnya
    const creatorText = isCreator ? 'Anda' : task.createdBy;

    
    taskDiv.innerHTML = `
        <div class="task-header">
            <div class="task-check">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${task.completed ? 'checked' : ''} 
                    onchange="toggleTask(${task.id})"
                    ${canToggle ? '' : 'disabled title="Hanya anggota yang ditugaskan atau pembuat yang dapat mengubah status"'}
                >
                <div class="task-text ${task.completed ? 'completed' : ''}">${task.text}</div>
            </div>
            <div class="task-priority ${task.priority}">${priorityText[task.priority]}</div>
        </div>
        
        <div class="task-meta">
            <p class="task-assignees">👥 **Ditugaskan kepada:** ${assigneesText}</p>
            <p class="task-creator">✍️ **Dibuat oleh:** ${creatorText}</p>
        </div>
        <div class="task-deadline ${isUrgent || isOverdue ? 'urgent' : ''}">
            ${isOverdue ? '⚠️ Overdue! ' : isUrgent ? '⏰ Urgent! ' : '📅'} ${deadlineText}
        </div>
        <div class="task-actions">
            <button class="btn-delete-task" onclick="deleteTask(${task.id})"
                ${canDelete ? '' : 'disabled title="Hanya pembuat tugas yang dapat menghapus"'}
            >Hapus 🗑️</button>
        </div>
    `;
    
    return taskDiv;
}

function formatDeadline(deadline) {
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return deadline.toLocaleDateString('id-ID', options);
}

// ===================================
// NOTIFICATION & UTILS (Tidak diubah, kecuali logic dipanggil di createTaskElement)
// ===================================

// [FUNGSI checkDeadlines, showDeadlineNotification, showNotification, requestNotificationPermission, showDeviceNotification, logoutBtn, dan profileModal LOGIC tetap sama]

// Deadline Checking Function - ENHANCED
function checkDeadlines() {
    const now = new Date();
    
    tasks.forEach(task => {
        if (task.completed) return;
        
        const deadline = new Date(`${task.date}T${task.time}`);
        const totalMinutesUntilDeadline = (deadline - now) / (1000 * 60);
        
        if (totalMinutesUntilDeadline > (7 * 24 * 60) + 10) return; 
        
        const notificationMessages = [];
        
        const days = Math.ceil(totalMinutesUntilDeadline / (24 * 60));
        const hours = Math.ceil(totalMinutesUntilDeadline / 60);
        const minutes = Math.ceil(totalMinutesUntilDeadline);

        if (totalMinutesUntilDeadline < 0) {
            if (totalMinutesUntilDeadline > -60) {
                notificationMessages.push({
                    type: 'urgent', 
                    message: `Deadline terlewat! Tugas: ${task.text.substring(0, 20)}... ⚠️`,
                    tag: 'overdue_1h'
                });
            }
        } else if (days > 0) {
            if (days <= 7 && days > 6) {
                 notificationMessages.push({
                    type: 'warning', 
                    message: `Deadline dalam 7 Hari! Tugas: ${task.text.substring(0, 20)}... 📅`,
                    tag: '7d'
                });
            } else if (days <= 3 && days > 2) {
                 notificationMessages.push({
                    type: 'warning', 
                    message: `Deadline dalam 3 Hari! Tugas: ${task.text.substring(0, 20)}... ⏰`,
                    tag: '3d'
                });
            }
        } else if (hours > 0) {
            if (hours <= 24 && hours > 23) {
                notificationMessages.push({
                    type: 'warning', 
                    message: `Deadline dalam 24 Jam! Tugas: ${task.text.substring(0, 20)}... ⏰`,
                    tag: '24h'
                });
            } else if (hours <= 1 && hours > 0) {
                notificationMessages.push({
                    type: 'urgent', 
                    message: `Deadline dalam 1 Jam! Tugas: ${task.text.substring(0, 20)}... 🚨`,
                    tag: '1h'
                });
            }
        } else if (minutes > 0) {
            if (minutes <= 30 && minutes > 29) {
                notificationMessages.push({
                    type: 'urgent', 
                    message: `Deadline dalam 30 Menit! Tugas: ${task.text.substring(0, 20)}... 🔥`,
                    tag: '30m'
                });
            } else if (minutes <= 5 && minutes > 4) {
                notificationMessages.push({
                    type: 'urgent', 
                    message: `Deadline dalam 5 Menit! Tugas: ${task.text.substring(0, 20)}... 🚨`,
                    tag: '5m'
                });
            }
        }
        notificationMessages.forEach(note => {
            const notificationKey = `notified_${task.id}_${note.tag}`; 
            if (!localStorage.getItem(notificationKey)) {
                showDeadlineNotification(task, note.type, note.message);
                localStorage.setItem(notificationKey, 'true');
                showDeviceNotification(note.message, task.text);
            }
        });
    });
    renderTasks();
}

function showDeadlineNotification(task, type, message) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const icon = type === 'urgent' ? '🚨' : '⏰';
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <h4>${message}</h4>
            <p>${task.text}</p>
        </div>
    `;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.5s ease-out reverse';
        setTimeout(() => notification.remove(), 500);
    }, 10000);
}

function showNotification(message, type) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const icons = {
        'success': '✅',
        'info': 'ℹ️',
        'warning': '⚠️',
        'urgent': '🚨'
    };
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || '📢'}</div>
        <div class="notification-content">
            <p>${message}</p>
        </div>
    `;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.5s ease-out reverse';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return;
    }
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log('Izin notifikasi perangkat diberikan. ✅');
            } else {
                console.log('Izin notifikasi perangkat ditolak. ❌');
            }
        });
    }
}

function showDeviceNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    try {
        const notification = new Notification(title, {
            body: body,
            icon: 'path/to/icon.png',
            tag: 'rise-task-deadline-' + Date.now()
        });
        notification.onclick = function() {
            window.focus();
        };
    } catch (error) {
        console.error("Gagal menampilkan notifikasi perangkat:", error);
    }
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Yakin mau logout? 👋')) {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
});

// Set minimum date to today
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const taskDateInput = document.getElementById('taskDate');
    if (taskDateInput) {
        taskDateInput.min = today;
    }
});


// ===================================
// PROFILE MODAL LOGIC (Disimpan dari kode Anda sebelumnya)
// ===================================

const modal = document.getElementById("profileModal");
const btn = document.getElementById("openProfileModalBtn");
const span = document.getElementsByClassName("close-btn")[0];

if (modal && btn && span) {
    // Ketika user mengklik tombol, buka modal
    btn.onclick = function() {
        modal.style.display = "block";
        
        // Isi form dengan data user saat ini
        const currentUser = sessionStorage.getItem('currentUser');
        if (currentUser) {
            const userData = JSON.parse(currentUser);
            document.getElementById('update-username').value = userData.username;
            document.getElementById('update-absen').value = userData.absen || '';
            document.getElementById('update-divisi').value = userData.divisi || '';
            document.getElementById('update-password').value = ''; // Kosongkan password
        }
    }

    // Ketika user mengklik (x), tutup modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // Ketika user mengklik di luar modal, tutup modal
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Form Update Profile Submission
    document.getElementById('profileUpdateForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newUsername = document.getElementById('update-username').value.trim();
        const newAbsen = document.getElementById('update-absen').value.trim();
        const newDivisi = document.getElementById('update-divisi').value.trim();
        const newPassword = document.getElementById('update-password').value;
        
        if (newUsername === "" || newAbsen === "" || newDivisi === "") {
            showNotification('Semua field (kecuali Password) harus diisi!', 'warning');
            return;
        }

        // 1. Update data di localStorage (daftar users)
        let users = JSON.parse(localStorage.getItem('users')) || [];
        let userIndex = users.findIndex(u => u.username === currentUsername);
        
        if (userIndex !== -1) {
            // Update data user di array users
            users[userIndex].username = newUsername;
            users[userIndex].absen = newAbsen;
            users[userIndex].divisi = newDivisi;
            if (newPassword) {
                users[userIndex].password = newPassword; // Dalam kasus nyata, hash password ini!
            }
            
            localStorage.setItem('users', JSON.stringify(users));

            // 2. Update data di sessionStorage (currentUser)
            let currentUserData = JSON.parse(sessionStorage.getItem('currentUser'));
            currentUserData.username = newUsername;
            currentUserData.absen = newAbsen;
            currentUserData.divisi = newDivisi;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUserData));
            
            // 3. Update UI dan array global
            currentUsername = newUsername;
            displayUserInfo(currentUserData);
            
            modal.style.display = "none";
            showNotification('Profile berhasil diperbarui! 🎉', 'success');
            
            // Perlu memuat ulang tugas karena username mungkin berubah atau data tugas perlu dicek
            loadTasks(); 
        } else {
            showNotification('Gagal memperbarui profile. User tidak ditemukan.', 'urgent');
        }
    });

} else {
    // console.error("Error: Modal atau tombol 'Ubah Profile' tidak ditemukan di DOM. Pastikan ID dan elemen HTML sudah benar.");
}