// Local dev server — loads .env and starts Express on a port
import 'dotenv/config';
import app from './api/app';

const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`Sapo API server running on http://localhost:${PORT}`);
  console.log(`  GET  /api/sapo/products  — cached products`);
  console.log(`  POST /api/sapo/sync      — trigger full sync`);
});

export default app;
