require("dotenv").config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const qr = require('qrcode');
const session = require('express-session');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware
app.use(session({
  secret: 'your-secret-key', // Choose a secret key for your session
  resave: false,
  saveUninitialized: true,
}));


app.get('/api/check-session', (req, res) => {
    if (req.session.isAdmin) {
      return res.json({ loggedIn: true });
    } else {
      return res.json({ loggedIn: false });
    }
  });

app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).send('Something went wrong!');
});

  

const db = mysql.createPool({
  host: 'bf4k5ujn77nhxmqrb6ap-mysql.services.clever-cloud.com',
  user: 'ujaiefkewncnxf0c',
  password: 'MPrllhROIVMTk2z9a0Ug',
  database: 'bf4k5ujn77nhxmqrb6ap',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// // Connect to the database
// db.connect((err) => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//    } else {
//     console.log('Connected to the database');
//   }
// });

const validEmail = 'a@gmail.com';
const validPassword = 'Shrikant@04';

// Admin login page
app.get('/admin_login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

//uploaads rout

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

//access rout

app.get('/access', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'access.html'));
});


//about

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

//contect

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});


//term 

app.get('/termcondition', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'termcondition.html'));
});




// Admin login authentication
app.post('/admin_login', (req, res) => {
  const { email, password } = req.body;

  if (req.session.isAdmin) {
    return res.redirect('/admin'); // If already logged in, redirect to admin page
  }

  if (email === validEmail && password === validPassword) {
    req.session.isAdmin = true; // Set session as logged in
    res.redirect('/admin');
  } else {
    res.send('<h2>Invalid Credentials, try again.</h2><a href="/admin_login">Go back</a>');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error during logout');
    }
    res.clearCookie('connect.sid'); // Clear the session cookie

    // Prevent back button from accessing previous session pages
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    res.redirect('/admin_login');
  });
});


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin page (Protected)
app.get('/admin', (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect('/admin_login'); // Redirect to login page if not logged in
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private'); // Prevent caching
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});



// Function to increment visitor count
const incrementVisitor = () => {
  const updateQuery = 'UPDATE visitor_count SET count = count + 1 WHERE id = 1';
  db.query(updateQuery, (err, result) => {
    if (err) console.error('Failed to update visitor count:', err);
  });
};

// API: Call this when page loads
app.get('/visit', (req, res) => {
  incrementVisitor();
  db.query('SELECT count FROM visitor_count WHERE id = 1', (err, result) => {
    if (err) {
      res.status(500).send('Error fetching count');
    } else {
      res.json({ count: result[0].count });
    }
  });
});








// Fetch file data for admin
app.get('/api/files', (req, res) => {
  const query = 'SELECT * FROM file_data';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching file data:', err.message);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: results });
  });
});

// Generate a unique 4-digit access code
const accessCodes = new Set();
const generateAccessCode = () => {
  let accessCode;
  do {
    accessCode = Math.floor(1000 + Math.random() * 9000);
  } while (accessCodes.has(accessCode));
  accessCodes.add(accessCode);
  return accessCode;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    const accessCode = generateAccessCode();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${accessCode}_${file.originalname.replace(fileExtension, '')}${fileExtension}`;
    cb(null, fileName);
    req.accessCode = accessCode; // Store access code in request object
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

app.post('/uploads/file', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 100MB limit.' });
    } else if (err) {
      return res.status(500).json({ message: 'File upload error.', error: err });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    const downloadLink = `https://feelfreeshare.me/uploads/${req.file.filename}`;

    const query = 'INSERT INTO file_data (file_name, access_code, date, time, download_link) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [req.file.filename, req.accessCode, date, time, downloadLink], (err) => {
      if (err) {
        console.error('Error saving file to database:', err);
        return res.status(500).json({ message: 'Error saving file data to the database.' });
      }

      qr.toDataURL(downloadLink, (err, qrCodeDataURL) => {
        if (err) {
          return res.status(500).json({ message: 'Error generating QR code.' });
        }

        res.json({
          message: 'File uploaded successfully!',
          file: req.file,
          accessCode: req.accessCode,
          dateTime: `${date} ${time}`,
          qrCode: qrCodeDataURL,
          downloadLink,
        });
      });
    });
  });
});


// Access file using access code
app.get('/access/:accessCode', (req, res) => {
  const accessCode = req.params.accessCode;

  const query = 'SELECT * FROM file_data WHERE access_code = ?';
  db.query(query, [accessCode], (err, results) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.json({
      success: true,
      fileName: results[0].file_name,
      date: results[0].date,
      time: results[0].time,
      downloadLink: `/uploads/${results[0].file_name}`,
    });
  });
});

// Fetch filtered file data for admin
app.get('/admin/data', (req, res) => {
  const { fileName, dateFilter } = req.query;
  let query = 'SELECT * FROM file_data';
  const conditions = [];

  if (fileName) {
    conditions.push(`file_name LIKE ${mysql.escape('%' + fileName + '%')}`);
  }
  if (dateFilter) {
    conditions.push(`date = ${mysql.escape(dateFilter)}`);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).send('Error fetching data');
    }

    let rows = results
      .map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${row.file_name}</td>
          <td>${row.access_code}</td>
          <td>${row.date}</td>
          <td>${row.time}</td>
          <td><a href="${row.download_link}" target="_blank" style="text-decoration: none;">👁️</a></td>
          <td> <button class="btn btn-danger btn-sm">🗑️ Delete</button></td>
          </tr>
      `)
      .join('');

    res.send(rows);
  });
});

// Start the server

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });



app.listen(PORT, '0.0.0.0', () => {
  console.log("Server is running on http://0.0.0.0:3000");
});
