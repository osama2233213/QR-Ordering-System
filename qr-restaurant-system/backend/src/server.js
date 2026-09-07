require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const seedDevGateAdmin = require('./utils/seedDevGateAdmin');

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();
  await seedDevGateAdmin();

  // Create HTTP Server & Initialize Socket.IO
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
