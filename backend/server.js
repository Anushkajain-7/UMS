const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'ums_secret_key'; // Simple secret for demonstration

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// POST /login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid email or password' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, studentId: user.id, name: user.name, role: user.role });
    });
});

// POST /register
app.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [name, email, hashedPassword, role || 'student'], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            return res.status(500).json({ message: 'Database error' });
        }

        const userId = this.lastID;
        // If student, create fee record
        if ((role || 'student') === 'student') {
            db.run("INSERT INTO fees (student_id, total_fees, paid_amount, pending_amount) VALUES (?, 50000, 0, 50000)", [userId]);
        }

        res.status(201).json({ message: 'User registered successfully', userId });
    });
});

// GET /fees/{student_id}
app.get('/fees/:student_id', authenticateToken, (req, res) => {
    const studentId = req.params.student_id;

    // Ensure student is requesting their own fees
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized access' });

    db.get("SELECT * FROM fees WHERE student_id = ?", [studentId], (err, fee) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!fee) return res.status(404).json({ message: 'Fee record not found' });
        res.json(fee);
    });
});

// POST /generate-qr
app.post('/generate-qr', authenticateToken, async (req, res) => {
    const { studentId, amount } = req.body;

    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized access' });

    const timestamp = new Date().toISOString();

    // Create a unique payment attempt in the database
    db.run("INSERT INTO payments (student_id, amount, status) VALUES (?, ?, 'PENDING')", [studentId, amount], async function (err) {
        if (err) return res.status(500).json({ message: 'Database error' });

        const paymentId = this.lastID;
        const qrData = JSON.stringify({
            paymentId,
            studentId,
            amount,
            timestamp
        });

        try {
            const qrCodeUrl = await QRCode.toDataURL(qrData);
            res.json({ qrCodeUrl, paymentId });
        } catch (err) {
            res.status(500).json({ message: 'Error generating QR code' });
        }
    });
});

// POST /confirm-payment
app.post('/confirm-payment', authenticateToken, (req, res) => {
    const { paymentId, studentId, amount } = req.body;

    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized access' });

    // In a real system, this would be triggered by a callback from a payment gateway.
    // Here we simulate it with a simple confirmation call.

    db.serialize(() => {
        // 1. Update Payment record
        db.run("UPDATE payments SET status = 'SUCCESS' WHERE payment_id = ?", [paymentId], (err) => {
            if (err) return res.status(500).json({ message: 'Error updating payment status' });

            // 2. Update Fees record (reduce pending, increase paid)
            db.run(`UPDATE fees 
                   SET paid_amount = paid_amount + ?, 
                       pending_amount = pending_amount - ? 
                   WHERE student_id = ?`,
                [amount, amount, studentId], (err) => {
                    if (err) return res.status(500).json({ message: 'Error updating fee records' });

                    res.json({ message: 'Payment successful and records updated' });
                });
        });
    });
});

// --- ACADEMIC ENDPOINTS ---

// GET /courses/{student_id}
app.get('/courses/:student_id', authenticateToken, (req, res) => {
    const studentId = req.params.student_id;
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized' });

    const query = `
        SELECT c.*, a.percentage 
        FROM courses c
        JOIN enrollments e ON c.course_id = e.course_id
        LEFT JOIN attendance a ON c.course_id = a.course_id AND a.student_id = e.student_id
        WHERE e.student_id = ?
    `;
    db.all(query, [studentId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// GET /timetable/{student_id}
app.get('/timetable/:student_id', authenticateToken, (req, res) => {
    const studentId = req.params.student_id;
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized' });

    const query = `
        SELECT t.*, c.course_name 
        FROM timetable t
        JOIN courses c ON t.course_id = c.course_id
        JOIN enrollments e ON c.course_id = e.course_id
        WHERE e.student_id = ?
        ORDER BY CASE 
            WHEN day = 'Monday' THEN 1
            WHEN day = 'Tuesday' THEN 2
            WHEN day = 'Wednesday' THEN 3
            WHEN day = 'Thursday' THEN 4
            WHEN day = 'Friday' THEN 5
        END, time ASC
    `;
    db.all(query, [studentId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// GET /resources/{student_id}
app.get('/resources/:student_id', authenticateToken, (req, res) => {
    const studentId = req.params.student_id;
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized' });

    const query = `
        SELECT r.*, c.course_name 
        FROM resources r
        JOIN courses c ON r.course_id = c.course_id
        JOIN enrollments e ON c.course_id = e.course_id
        WHERE e.student_id = ?
    `;
    db.all(query, [studentId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// --- EXAMINATION ENDPOINTS ---

// GET /exams
app.get('/exams', authenticateToken, (req, res) => {
    db.all("SELECT * FROM exams ORDER BY date ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// GET /results/:student_id
app.get('/results/:student_id', authenticateToken, (req, res) => {
    const studentId = req.params.student_id;
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized' });

    db.all("SELECT * FROM results WHERE student_id = ?", [studentId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// --- ASSIGNMENT ENDPOINTS ---

// GET /assignments/:student_id
app.get('/assignments/:student_id', authenticateToken, (req, res) => {
    const studentId = req.params.student_id;
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized' });

    const query = `
        SELECT a.*, s.status, s.submitted_at 
        FROM assignments a
        JOIN submissions s ON a.id = s.assignment_id
        WHERE s.student_id = ?
    `;
    db.all(query, [studentId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// POST /submit-assignment
app.post('/submit-assignment', authenticateToken, (req, res) => {
    const { studentId, assignmentId } = req.body;
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized' });

    const submittedAt = new Date().toISOString();
    const query = `
        UPDATE submissions 
        SET status = 'Submitted', submitted_at = ? 
        WHERE student_id = ? AND assignment_id = ?
    `;
    db.run(query, [submittedAt, studentId, assignmentId], function (err) {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'Assignment submitted successfully', submittedAt });
    });
});

// GET /recent-activity/:student_id
app.get('/recent-activity/:student_id', authenticateToken, (req, res) => {
    const studentId = req.params.student_id;
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized' });

    const query = `
        SELECT a.title, s.submitted_at 
        FROM assignments a
        JOIN submissions s ON a.id = s.assignment_id
        WHERE s.student_id = ? AND s.status = 'Submitted'
        ORDER BY s.submitted_at DESC
        LIMIT 5
    `;
    db.all(query, [studentId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// --- PROFILE ENDPOINTS ---

// PUT /profile/:student_id
app.post('/profile/:student_id', authenticateToken, (req, res) => {
    const studentId = req.params.student_id;
    const { name, email } = req.body;
    if (req.user.id != studentId) return res.status(403).json({ message: 'Unauthorized' });

    db.run("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, studentId], function (err) {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'Profile updated successfully', name, email });
    });
});

// --- COMMUNICATION ENDPOINTS ---

// GET /contacts
app.get('/contacts', authenticateToken, (req, res) => {
    // Only fetch teachers, HOD, and admin
    db.all("SELECT id, name, role, subject FROM users WHERE role != 'student'", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// GET /messages/:contact_id
app.get('/messages/:contact_id', authenticateToken, (req, res) => {
    const studentId = req.user.id;
    const contactId = req.params.contact_id;

    const query = `
        SELECT * FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) 
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY timestamp ASC
    `;
    db.all(query, [studentId, contactId, contactId, studentId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// POST /send-message
app.post('/send-message', authenticateToken, (req, res) => {
    const senderId = req.user.id;
    const { receiverId, text } = req.body;

    db.run("INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)", [senderId, receiverId, text], function (err) {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ id: this.lastID, sender_id: senderId, receiver_id: receiverId, text, timestamp: new Date().toISOString() });
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
