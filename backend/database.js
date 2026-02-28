const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'ums.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // --- CORE TABLES ---

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            subject TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER,
            receiver_id INTEGER,
            text TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS fees (
            student_id INTEGER PRIMARY KEY,
            total_fees REAL DEFAULT 0,
            paid_amount REAL DEFAULT 0,
            pending_amount REAL DEFAULT 0,
            FOREIGN KEY (student_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS payments (
            payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'PENDING',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id)
        )`);

        // --- ACADEMIC TABLES ---

        db.run(`CREATE TABLE IF NOT EXISTS courses (
            course_id TEXT PRIMARY KEY,
            course_name TEXT NOT NULL,
            faculty TEXT NOT NULL,
            credits INTEGER NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS enrollments (
            student_id INTEGER,
            course_id TEXT,
            PRIMARY KEY (student_id, course_id),
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (course_id) REFERENCES courses(course_id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            student_id INTEGER,
            course_id TEXT,
            percentage INTEGER DEFAULT 0,
            PRIMARY KEY (student_id, course_id),
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (course_id) REFERENCES courses(course_id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS timetable (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id TEXT,
            day TEXT NOT NULL,
            time TEXT NOT NULL,
            room TEXT NOT NULL,
            FOREIGN KEY (course_id) REFERENCES courses(course_id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id TEXT,
            title TEXT NOT NULL,
            link TEXT NOT NULL,
            type TEXT DEFAULT 'PDF',
            FOREIGN KEY (course_id) REFERENCES courses(course_id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS exams (
            exam_id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            room TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS results (
            student_id INTEGER,
            subject TEXT NOT NULL,
            marks INTEGER NOT NULL,
            total INTEGER NOT NULL,
            grade TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            title TEXT NOT NULL,
            deadline TEXT NOT NULL,
            faculty TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS submissions (
            student_id INTEGER,
            assignment_id INTEGER,
            status TEXT DEFAULT 'Pending',
            submitted_at DATETIME,
            PRIMARY KEY (student_id, assignment_id),
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (assignment_id) REFERENCES assignments(id)
        )`);

        // --- SEEDING ---

        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (row && row.count === 0) {
                const bcrypt = require('bcryptjs');
                const hashedPassword = bcrypt.hashSync('password123', 10);

                // 1. Seed Student
                db.run(`INSERT INTO users (name, email, password, role) VALUES ('John Doe', 'john@example.com', ?, 'student')`, [hashedPassword], function (err) {
                    if (err) return console.error(err);
                    const studentId = this.lastID;

                    // Fees
                    db.run(`INSERT INTO fees (student_id, total_fees, paid_amount, pending_amount) VALUES (?, 50000, 10000, 40000)`, [studentId]);

                    // Academics
                    const courses = [
                        ['CS101', 'Cloud Computing', 'Prof. Alistair', 4],
                        ['CS102', 'Artificial Intelligence', 'Dr. Sullivan', 4],
                        ['CS103', 'Computer Networks', 'Prof. Miller', 3],
                        ['MA201', 'Economics for Engineers', 'Dr. Smith', 3]
                    ];
                    courses.forEach(c => {
                        db.run("INSERT OR IGNORE INTO courses (course_id, course_name, faculty, credits) VALUES (?, ?, ?, ?)", c);
                        db.run("INSERT OR IGNORE INTO enrollments (student_id, course_id) VALUES (?, ?)", [studentId, c[0]]);
                    });

                    // Exams & Results
                    db.run("INSERT INTO exams (subject, date, time, room) VALUES ('Cloud Computing', '2026-03-15', '10:00 AM', 'Hall A')");
                    db.run("INSERT INTO exams (subject, date, time, room) VALUES ('Artificial Intelligence', '2026-03-18', '02:00 PM', 'Hall B')");

                    const resultData = [
                        [studentId, 'Mathematics I', 85, 100, 'A'],
                        [studentId, 'Physics', 78, 100, 'B+'],
                        [studentId, 'Programming in C', 92, 100, 'A+']
                    ];
                    resultData.forEach(r => db.run("INSERT INTO results (student_id, subject, marks, total, grade) VALUES (?, ?, ?, ?, ?)", r));

                    // Assignments
                    const assignmentData = [
                        ['Cloud Computing', 'Cloud Architecture Design', '2026-03-05', 'Prof. Alistair'],
                        ['Artificial Intelligence', 'Neural Network Implementation', '2026-03-10', 'Dr. Sullivan']
                    ];
                    assignmentData.forEach(a => {
                        db.run("INSERT INTO assignments (subject, title, deadline, faculty) VALUES (?, ?, ?, ?)", a, function () {
                            db.run("INSERT INTO submissions (student_id, assignment_id, status) VALUES (?, ?, 'Pending')", [studentId, this.lastID]);
                        });
                    });
                });

                // 2. Seed Faculty & Admin
                const faculty = [
                    ['Prof. Alistair', 'alistair@futurense.edu', hashedPassword, 'teacher', 'Cloud Computing'],
                    ['Dr. Sullivan', 'sullivan@futurense.edu', hashedPassword, 'teacher', 'Artificial Intelligence'],
                    ['Dr. Robert Brown', 'hod.cse@futurense.edu', hashedPassword, 'HOD', 'Computer Science'],
                    ['Admin Sarah', 'admin@futurense.edu', hashedPassword, 'admin', 'Registrar Office']
                ];
                faculty.forEach(f => db.run("INSERT INTO users (name, email, password, role, subject) VALUES (?, ?, ?, ?, ?)", f));

                // 3. Initial Message
                db.run("INSERT INTO messages (sender_id, receiver_id, text) VALUES (2, 1, 'Welcome to the course!')");
            }
        });
    });
}

module.exports = db;
