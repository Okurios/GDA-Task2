require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { initDatabase } = require('./database');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/reviews',  require('./routes/reviews'));
app.use('/api/auth',     require('./routes/reset'));   // forgot/reset password

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'GDA Sports API is running 🚀' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'register-v2.html')));

// ─── 404 catch-all (must be last) ────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║            GDA Sports - Backend Server               ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║   Running at : http://localhost:${PORT}                   ║`);
      console.log('║   Shop       : http://localhost:3000/register-v2.html ║');
      console.log('║   Admin      : http://localhost:3000/admin-v2.html    ║');
      console.log('║   Admin creds: admin@gda.com  /  Admin1234!           ║');
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('❌  Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
