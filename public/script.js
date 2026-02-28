document.addEventListener('DOMContentLoaded', async () => {

    // --- PRODUCTION UTILITIES ---
    const showLoader = (show) => {
        const loader = document.getElementById('globalLoader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    };

    const setDynamicGreeting = () => {
        const hour = new Date().getHours();
        let greeting = 'Good Evening';
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 17) greeting = 'Good Afternoon';

        const moduleTitle = document.getElementById('currentModuleTitle');
        if (moduleTitle && moduleTitle.textContent === 'Student Portal') {
            moduleTitle.innerHTML = `${greeting}, <span style="color: var(--accent-gold);">${localStorage.getItem('userName') || 'Scholar'}</span>`;
        }
    };

    // 0. Auth Guard & Initialization
    showLoader(true);
    const token = localStorage.getItem('token');
    if (!token && !window.location.pathname.includes('auth.html')) {
        window.location.href = '/auth.html';
        return;
    }

    // Set User Profile UI from Storage
    const userName = localStorage.getItem('userName') || 'John Doe';
    document.getElementById('navUserName').textContent = userName;
    if (document.getElementById('editName')) {
        document.getElementById('editName').value = userName;
    }

    setDynamicGreeting();
    setTimeout(() => showLoader(false), 800); // Smooth entrance

    // Logout Logic
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            showLoader(true);
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '/auth.html';
            }, 500);
        });
    }

    // 1. Navigation Controller (Sidebar + Page Switch)
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.page-section');
    const moduleTitle = document.getElementById('currentModuleTitle');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');

            // Update Sidebar State
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Swap Sections
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === targetId) {
                    sec.classList.add('active');

                    // Update Header Title
                    const label = link.querySelector('span').textContent;
                    moduleTitle.textContent = targetId === 'dashboard' ? 'Student Portal' : label;

                    // Reset Scroll
                    document.querySelector('.main-content').scrollTop = 0;
                }
            });
        });
    });

    // 2. Premium Hero Carousel Logic
    const heroTrack = document.getElementById('heroTrack');
    const heroSlides = document.querySelectorAll('.hero-slide');
    let currentHeroSlide = 0;

    function nextHeroSlide() {
        heroSlides[currentHeroSlide].classList.remove('active');
        currentHeroSlide = (currentHeroSlide + 1) % heroSlides.length;
        heroTrack.style.transform = `translateX(-${currentHeroSlide * 100}%)`;
        heroSlides[currentHeroSlide].classList.add('active');
    }

    if (heroTrack) {
        setInterval(nextHeroSlide, 8000); // 8 seconds per slide for cinematic feel
    }

    // 3. Scroll Reveal Observer (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.15 });

    revealElements.forEach(el => revealObserver.observe(el));

    // 4. Auto-scrolling Logic for Institutional Briefs
    const newsList = document.querySelector('.news-list');
    if (newsList) {
        setInterval(() => {
            const firstItem = newsList.querySelector('.announcement-item');
            if (firstItem) {
                firstItem.style.transition = 'margin-top 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease';
                firstItem.style.marginTop = `-${firstItem.offsetHeight}px`;
                firstItem.style.opacity = '0';

                setTimeout(() => {
                    newsList.appendChild(firstItem);
                    firstItem.style.transition = 'none';
                    firstItem.style.marginTop = '0';
                    firstItem.style.opacity = '1';
                }, 800);
            }
        }, 6000);
    }

    // 5. Micro-interactions & Mouse Effects
    const mainContent = document.querySelector('.main-content');
    mainContent.addEventListener('scroll', () => {
        // Subtle background movement simulation
        const scrollAmount = mainContent.scrollTop;
        mainContent.style.backgroundPosition = `center ${scrollAmount * 0.1}px`;
    });

    // Quick Action simulation
    const quickButtons = document.querySelectorAll('.quick-btn');
    quickButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.textContent.toLowerCase().includes('fee')) {
                window.location.href = 'dashboard.html';
            } else {
                alert(`${btn.textContent} module is currently being optimized.`);
            }
        });
    });

    // 6. ACADEMICS LOGIC & DSA
    async function loadAcademics() {
        // Simple authentication check - retrieval from local storage (John Doe id: 1)
        // In a real app we'd get this from the login response
        const studentId = localStorage.getItem('studentId') || 1;
        const token = localStorage.getItem('token');

        if (!token) {
            console.error('Portal: Unauthorized access attempt.');
            return;
        }

        try {
            // Fetch All Data
            const [courses, timetable, resources] = await Promise.all([
                fetch(`http://localhost:5000/courses/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
                fetch(`http://localhost:5000/timetable/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
                fetch(`http://localhost:5000/resources/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
            ]);

            // --- DSA IMPLEMENTATION ---

            // 1. ARRAY: Store course list (Ordered as fetched)
            const courseList = Array.isArray(courses) ? courses : [];

            // 2. HASH MAP: Quick lookup for course details by ID
            const courseMap = new Map();
            courseList.forEach(c => courseMap.set(c.course_id, c));

            // 3. QUEUE: Manage Class Scheduling
            // We'll use a queue to identify "Next Active Classes" for today
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            const todayClasses = timetable.filter(t => t.day === today);

            // Queue simulation for scheduling
            const classQueue = [...todayClasses]; // Simple FIFO queue

            // --- RENDER UI ---

            // A. Render Course Cards
            const courseGrid = document.getElementById('courseGrid');
            if (courseGrid) {
                courseGrid.innerHTML = courseList.map(c => `
                    <div class="panel course-card">
                        <span class="hero-badge" style="font-size: 0.6rem; letter-spacing: 0.2em;">${c.course_id}</span>
                        <h4>${c.course_name}</h4>
                        <span class="faculty-name">${c.faculty}</span>
                        <div class="course-stats">
                            <div class="stat-item">
                                <span>Attendance</span>
                                <strong>${c.percentage}%</strong>
                            </div>
                            <div class="stat-item">
                                <span>Credits</span>
                                <strong>${c.credits}</strong>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            // B. Render Timetable
            const timetableGrid = document.getElementById('timetableGrid');
            if (timetableGrid) {
                const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                timetableGrid.innerHTML = weekdays.map(day => {
                    const daySlots = timetable.filter(t => t.day === day);
                    return `
                        <div class="day-column">
                            <div class="day-header">${day}</div>
                            ${daySlots.map(slot => `
                                <div class="slot">
                                    <h5>${slot.course_name}</h5>
                                    <p>${slot.time}</p>
                                    <p class="room">${slot.room}</p>
                                </div>
                            `).join('') || '<div style="padding: 20px; font-size: 0.7rem; color: #555;">No classes.</div>'}
                        </div>
                    `;
                }).join('');
            }

            // C. Render Attendance List
            const attendanceList = document.getElementById('attendanceList');
            if (attendanceList) {
                attendanceList.innerHTML = courseList.map(c => `
                    <div class="attendance-row">
                        <div class="attendance-label">
                            <span>${c.course_name}</span>
                            <strong>${c.percentage}%</strong>
                        </div>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${c.percentage}%"></div>
                        </div>
                    </div>
                `).join('');
            }

            // D. Render Resources
            const resourceGrid = document.getElementById('resourceGrid');
            if (resourceGrid) {
                // STACK: Recent Resources accessed (Simulation using reverse array)
                const resourceStack = [...resources].reverse();

                resourceGrid.innerHTML = resourceStack.map(r => `
                    <a href="${r.link}" class="resource-item">
                        <i class="fas ${r.type === 'PDF' ? 'fa-file-pdf' : 'fa-link'}"></i>
                        <div class="resource-info">
                            <h6>${r.title}</h6>
                            <span>${r.course_name}</span>
                        </div>
                    </a>
                `).join('');
            }

        } catch (err) {
            console.error('Academics: Data fetch failed.', err);
        }
    }

    // 7. EXAMINATIONS LOGIC & DSA
    async function loadExams() {
        const studentId = localStorage.getItem('studentId') || 1;
        const token = localStorage.getItem('token');

        try {
            const [exams, results] = await Promise.all([
                fetch(`http://localhost:5000/exams`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
                fetch(`http://localhost:5000/results/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
            ]);

            // --- DSA IMPLEMENTATION ---

            // 1. SORTING: Sort exams naturally by date (asc)
            const sortedExams = exams.sort((a, b) => new Date(a.date) - new Date(b.date));

            // 2. QUEUE: Nearest exam is at the head of the list
            const examQueue = [...sortedExams];

            // 3. HASH MAP: Map subjects to grades for quick analytics
            const resultMapper = new Map();
            results.forEach(r => resultMapper.set(r.subject, r.grade));

            // --- RENDER UI ---

            // A. Render Timeline
            const examTimeline = document.getElementById('examTimeline');
            if (examTimeline) {
                examTimeline.innerHTML = examQueue.map((exam, index) => `
                    <div class="timeline-item ${index === 0 ? 'next-exam' : ''}">
                        <div class="timeline-date">${new Date(exam.date).toDateString()}</div>
                        <div class="timeline-info">
                            <h5>${exam.subject}</h5>
                            <p><i class="fas fa-clock"></i> ${exam.time} | <i class="fas fa-map-marker-alt"></i> ${exam.room}</p>
                            ${index === 0 ? '<span class="status-badge status-urgent" style="margin-top: 10px; display: inline-block;">Nearest Exam</span>' : ''}
                        </div>
                    </div>
                `).join('');
            }

            // B. Render Results Table
            // SORTING: Sort results by marks descending for performance ranking
            const sortedResults = results.sort((a, b) => b.marks - a.marks);
            const tableBody = document.getElementById('resultsTableBody');
            if (tableBody) {
                tableBody.innerHTML = sortedResults.map(r => `
                    <tr>
                        <td><strong>${r.subject}</strong></td>
                        <td>
                            ${r.marks} / ${r.total}
                            <div class="progress-container" style="margin-top: 5px; height: 4px;">
                                <div class="progress-bar" style="width: ${(r.marks / r.total) * 100}%"></div>
                            </div>
                        </td>
                        <td><span class="grade-badge">${r.grade}</span></td>
                    </tr>
                `).join('');
            }

            // C. Update Performance Stats
            const totalMarks = results.reduce((sum, r) => sum + r.marks, 0);
            const avgPercentage = (totalMarks / (results.length * 100)) * 100;
            const cgpa = (avgPercentage / 9.5).toFixed(2); // Simple conversion

            document.getElementById('overallCgpa').textContent = cgpa;
            document.getElementById('totalCredits').textContent = (results.length * 4); // Simulating 4 credits per subject

        } catch (err) {
            console.error('Examinations: Data fetch failed.', err);
        }
    }

    // 8. ASSIGNMENTS LOGIC & DSA
    async function loadAssignments() {
        const studentId = localStorage.getItem('studentId') || 1;
        const token = localStorage.getItem('token');

        try {
            const assignments = await fetch(`http://localhost:5000/assignments/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json());

            // --- DSA IMPLEMENTATION ---

            // 1. HASH MAP: Map assignment ID to its details for constant-time lookup
            const assignmentMap = new Map();
            assignments.forEach(a => assignmentMap.set(a.id, a));

            // 2. PRIORITY QUEUE (Simulated via Sort): Sort by deadline urgency
            // Nearest deadlines first. Urgent if < 5 days away.
            const priorityList = [...assignments].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

            // 3. STACK (Submissions): Recently submitted shown first
            const submittedList = assignments.filter(a => a.status === 'Submitted')
                .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

            // --- RENDER UI ---

            // A. Render Main List
            const assignmentGrid = document.getElementById('assignmentGrid');
            if (assignmentGrid) {
                assignmentGrid.innerHTML = priorityList.map(a => {
                    const deadlineDate = new Date(a.deadline);
                    const isUrgent = (deadlineDate - new Date()) / (1000 * 60 * 60 * 24) < 5 && a.status === 'Pending';
                    const statusClass = `status-${a.status.toLowerCase()}`;

                    return `
                        <div class="assignment-card ${isUrgent ? 'urgent-pulse' : ''}" data-id="${a.id}">
                            <span class="assignment-status ${statusClass}">${a.status}</span>
                            <h5>${a.title}</h5>
                            <div class="assignment-meta">
                                <p><i class="fas fa-book"></i> ${a.subject}</p>
                                <p><i class="fas fa-calendar-alt"></i> Deadline: ${deadlineDate.toDateString()}</p>
                                <p><i class="fas fa-user-tie"></i> ${a.faculty}</p>
                            </div>
                            <div class="assignment-actions">
                                <span style="font-size: 0.7rem; color: var(--accent-gold-soft);">${isUrgent ? '! High Priority' : ''}</span>
                                <button class="submit-btn" 
                                        onclick="submitAssignment(${a.id})" 
                                        ${a.status === 'Submitted' ? 'disabled' : ''}>
                                    ${a.status === 'Submitted' ? 'Submitted' : 'Upload & Submit'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // B. Render Recent Activity (Stack Concept)
            const submissionStack = document.getElementById('submissionStack');
            if (submissionStack) {
                submissionStack.innerHTML = submittedList.slice(0, 5).map(a => `
                    <div class="activity-item">
                        <div class="activity-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="activity-content">
                            <h6>${a.title}</h6>
                            <span>Submitted on ${new Date(a.submitted_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                `).join('') || '<p style="padding: 15px; font-size: 0.75rem; color: #555;">No recent submissions.</p>';
            }

        } catch (err) {
            console.error('Assignments: Data fetch failed.', err);
        }
    }

    // Submission Logic
    window.submitAssignment = async (assignmentId) => {
        const studentId = localStorage.getItem('studentId') || 1;
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('http://localhost:5000/submit-assignment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ studentId, assignmentId })
            });
            const data = await response.json();
            if (response.ok) {
                alert('Assignment Submitted Successfully!');
                loadAssignments(); // Reload to update UI
            }
        } catch (err) {
            console.error('Submission failed.', err);
        }
    };

    // Trigger Load on Sidebar Click
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.getAttribute('data-target');
            if (target === 'academics') loadAcademics();
            if (target === 'exams') loadExams();
            if (target === 'assignments') {
                loadAssignments();
                setTimeout(() => {
                    document.querySelectorAll('#assignments .reveal').forEach(el => el.classList.add('active'));
                }, 100);
            }
        });
    });

    // 9. LOGO & PROFILE INTERACTIONS
    const sidebarLogo = document.getElementById('sidebarLogo');
    const profileHeader = document.getElementById('userProfileHeader');
    const profileForm = document.getElementById('profileForm');

    // Logo -> Dashboard
    sidebarLogo.addEventListener('click', () => {
        const dashboardLink = document.querySelector('.sidebar-link[data-target="dashboard"]');
        if (dashboardLink) dashboardLink.click();
    });

    // Header Profile -> Profile Page
    profileHeader.addEventListener('click', () => {
        // Hide all sections, show profile
        sections.forEach(sec => sec.classList.remove('active'));
        const profileSec = document.getElementById('profile');
        if (profileSec) {
            profileSec.classList.add('active');
            moduleTitle.textContent = 'Personal Profile';
            sidebarLinks.forEach(l => l.classList.remove('active'));
            // Trigger reveals
            setTimeout(() => {
                document.querySelectorAll('#profile .reveal').forEach(el => el.classList.add('active'));
            }, 100);
        }
    });

    // Profile Form Submission
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = localStorage.getItem('studentId') || 1;
            const token = localStorage.getItem('token');
            const name = document.getElementById('editName').value;
            const email = document.getElementById('editEmail').value;

            try {
                const response = await fetch(`http://localhost:5000/profile/${studentId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, email })
                });

                if (response.ok) {
                    alert('Profile updated successfully!');
                    // Update Header UI
                    document.getElementById('navUserName').textContent = name;
                } else {
                    alert('Failed to update profile.');
                }
            } catch (err) {
                console.error('Profile Update Error:', err);
            }
        });
    }

    // 10. COMMUNICATION LOGIC & DSA
    let activeContactId = null;
    const messageCache = new Map(); // HASH MAP: receiverId -> Array of messages for fast retrieval
    const recentContactsStack = []; // STACK: Track last contacted users (Optional concept)

    async function loadContacts() {
        const token = localStorage.getItem('token');
        try {
            const contacts = await fetch('http://localhost:5000/contacts', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            const contactList = document.getElementById('contactList');
            if (contactList) {
                contactList.innerHTML = contacts.map(c => `
                    <div class="contact-item" onclick="selectContact(${c.id}, '${c.name}', '${c.role}')" id="contact-${c.id}">
                        <div class="contact-info">
                            <h6>${c.name}</h6>
                            <p>${c.role} ${c.subject ? `• ${c.subject}` : ''}</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('Contacts: Load failed.', err);
        }
    }

    window.selectContact = async (id, name, role) => {
        activeContactId = id;

        // Update UI
        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`contact-${id}`).classList.add('active');

        document.getElementById('activeChatHeader').innerHTML = `
            <div class="active-contact" style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: var(--accent-gold); color: var(--primary-bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">${name.charAt(0)}</div>
                <div>
                    <h5 style="color: var(--text-primary); margin-bottom: 2px;">${name}</h5>
                    <p style="color: var(--accent-gold-soft); font-size: 0.65rem; text-transform: uppercase; font-weight: 600;">${role}</p>
                </div>
            </div>
        `;

        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendMessageBtn').disabled = false;

        loadMessages(id);
    };

    async function loadMessages(contactId) {
        const token = localStorage.getItem('token');
        try {
            const messages = await fetch(`http://localhost:5000/messages/${contactId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            // HASH MAP USAGE: Update cache
            messageCache.set(contactId, messages);

            renderMessages(messages);
        } catch (err) {
            console.error('Messages: Load failed.', err);
        }
    }

    function renderMessages(messages) {
        const messageArea = document.getElementById('messageArea');
        const studentId = parseInt(localStorage.getItem('studentId')) || 1;

        if (messageArea) {
            messageArea.innerHTML = messages.map(msg => `
                <div class="message-bubble ${msg.sender_id === studentId ? 'msg-sent' : 'msg-received'}">
                    ${msg.text}
                    <span class="msg-time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            `).join('');
            messageArea.scrollTop = messageArea.scrollHeight;
        }
    }

    // Send Message
    document.getElementById('sendMessageBtn').addEventListener('click', async () => {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        const token = localStorage.getItem('token');

        if (!text || !activeContactId) return;

        try {
            const response = await fetch('http://localhost:5000/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ receiverId: activeContactId, text })
            });

            if (response.ok) {
                input.value = '';
                loadMessages(activeContactId);
            }
        } catch (err) {
            console.error('Send failed.', err);
        }
    });

    // Handle pressing Enter to send
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('sendMessageBtn').click();
    });

    // Simulation: Polling for new messages every 5 seconds
    setInterval(() => {
        if (activeContactId && document.getElementById('communication').classList.contains('active')) {
            loadMessages(activeContactId);
        }
    }, 5000);

    // Update Sidebar Listener
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.getAttribute('data-target');
            if (target === 'communication') {
                loadContacts();
                setTimeout(() => {
                    document.querySelectorAll('#communication .reveal').forEach(el => el.classList.add('active'));
                }, 100);
            }
        });
    });

    console.log('Premium UMS Portal: Communication System Initialized.');
});
