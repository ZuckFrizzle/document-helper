const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');
const app = express();
const DEFAULT_PORT = 4000;

app.use(express.static(path.join(__dirname, "uploads")));

app.post("/convert-pdf", (req, res) => {
    const pdfPath = req.body.pdfPath;
    const outputHtml = pdfPath.replace(".pdf", ".html");

    exec(`pdf2htmlEX --zoom 1.3 ${pdfPath} ${outputHtml}`, (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to convert PDF" });
        }
        res.json({ htmlPath: outputHtml });
    });
});



// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Find an available port
const server = app.listen(DEFAULT_PORT, () => {
  console.log(`Server running on port ${server.address().port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${DEFAULT_PORT} in use, trying another port...`);
    server.listen(0);
  } else {
    console.error('Server error:', err);
  }
});

// In-memory data storage (for demo purposes)
let users = [];       // { username, email, password }
let sessions = {};    // sessionId -> username
let documents = [];   // { docId, fileName, metadata, owner }

// Helper to fix file name encoding issues
function fixFileNameEncoding(originalName) {
  const buf = Buffer.from(originalName, 'binary');
  return iconv.decode(buf, 'utf-8');
}

// Serve static files
app.use('/uploads', express.static(uploadDir));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
function requireLogin(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  req.username = sessions[sessionId];
  next();
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

// Routes

app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  users.push({ username, email, password });
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const sessionId = uuidv4();
  sessions[sessionId] = user.username;
  res.json({ success: true, sessionId, username: user.username, email: user.email });
});

app.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
  }
  res.json({ success: true });
});

app.post('/documents', requireLogin, upload.single('pdfFile'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const metadata = {
      fileName: fixFileNameEncoding(file.originalname),
      docId: uuidv4(),
      dateCreated: new Date().toISOString().split('T')[0],
      signatory: 'N/A',
      students: [],
      staffs: []
    };
    const docObj = {
      docId: metadata.docId,
      fileName: file.filename,
      metadata,
      owner: req.username
    };
    documents.push(docObj);
    res.json({ success: true, doc: docObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/documents', requireLogin, (req, res) => {
  const userDocs = documents.filter(doc => doc.owner === req.username);
  res.json({ success: true, documents: userDocs });
});

app.put('/documents/:docId', requireLogin, (req, res) => {
  const { docId } = req.params;
  const doc = documents.find(d => d.docId === docId && d.owner === req.username);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or not owned by user' });
  }
  Object.assign(doc.metadata, req.body);
  res.json({ success: true, doc });
});

app.delete('/documents/:docId', requireLogin, (req, res) => {
  const { docId } = req.params;
  const index = documents.findIndex(d => d.docId === docId && d.owner === req.username);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found or not owned by user' });
  }
  documents.splice(index, 1);
  res.json({ success: true });
});

app.post('/documents/:docId/share', requireLogin, (req, res) => {
  const { docId } = req.params;
  const doc = documents.find(d => d.docId === docId && d.owner === req.username);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or not owned by user' });
  }
  res.json({ success: true, shareLink: `http://localhost:${server.address().port}/uploads/${doc.fileName}` });
});


app.post('/extract-signature', async (req, res) => {
  const { pdfPath } = req.body;
  const { exec } = require('child_process');
  exec(`python extract_signature.py ${pdfPath}`, (error, stdout) => {
    if (error) return res.status(500).json({ error: "Failed to extract signature" });
    res.json({ signatures: stdout });
  });
});
