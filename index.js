const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
// Menggunakan port dari server Render, atau port 3000 jika berjalan di laptop Anda
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./jadwal.db', (err) => {
  if (err) {
    console.error('Gagal terhubung ke database:', err.message);
  } else {
    console.log('Berhasil terhubung ke database SQLite.');
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, program TEXT)`);
      db.run(`CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, time_slot TEXT, col_index INTEGER, student_name TEXT)`);
    });
  }
});

// ================= ENDPOINT MASTER SISWA =================
app.get('/api/students', (req, res) => {
  db.all("SELECT * FROM students ORDER BY name ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/students', (req, res) => {
  const { name, program } = req.body;
  if (!name || !program) return res.status(400).json({ error: "Nama dan Program harus diisi" });

  db.run("INSERT INTO students (name, program) VALUES (?, ?)", [name, program], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, program });
  });
});

// FITUR BARU: Hapus siswa dari master database
app.delete('/api/students/:id', (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM students WHERE id = ?", id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Data siswa berhasil dihapus" });
  });
});

// ================= ENDPOINT JADWAL =================
app.get('/api/schedules', (req, res) => {
  const { date } = req.query;
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
  const deleteTarget = eightDaysAgo.toISOString().split('T')[0];
  
  db.run("DELETE FROM schedules WHERE date <= ?", [deleteTarget]);

  db.all("SELECT * FROM schedules WHERE date = ?", [date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/schedules', (req, res) => {
  const { date, slots } = req.body;
  if (!date || !slots) return res.status(400).json({ error: "Data tidak lengkap" });

  db.run("DELETE FROM schedules WHERE date = ?", [date], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    const stmt = db.prepare("INSERT INTO schedules (date, time_slot, col_index, student_name) VALUES (?, ?, ?, ?)");
    slots.forEach(slot => stmt.run(date, slot.time_slot, slot.col_index, slot.student_name));
    stmt.finalize();
    res.json({ message: "Jadwal sukses disimpan untuk tanggal " + date });
  });
});

app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));