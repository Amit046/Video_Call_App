import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};
let usernames = {}; // Track usernames by socket ID

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ USER CONNECTED:", socket.id);

    socket.on("join-call", (path, username) => {
      console.log(`👤 ${username} joining room: ${path}`);
      
      if (connections[path] === undefined) {
        connections[path] = [];
      }

      connections[path].push(socket.id);
      timeOnline[socket.id] = new Date();
      usernames[socket.id] = username || "User"; // Store username

      console.log(`📋 Room ${path} clients:`, connections[path]);

      // Notify all users in the room (including the new joiner)
      for (let a = 0; a < connections[path].length; a++) {
        const clientId = connections[path][a];
        
        // Send username of the joining user, not the receiving user
        io.to(clientId).emit(
          "user-joined",
          socket.id,           // ID of the user who joined
          username || "User",  // Username of joining user
          connections[path]    // Array of all socket IDs in room
        );
      }

      console.log(`✅ Emitted user-joined event`);
      console.log(`   - Joiner ID: ${socket.id}`);
      console.log(`   - Username: ${username}`);
      console.log(`   - Clients in room:`, connections[path]);

      // Send chat history to the new joiner
      if (messages[path] !== undefined) {
        console.log(`📨 Sending ${messages[path].length} chat messages to ${socket.id}`);
        for (let a = 0; a < messages[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][a]["data"],
            messages[path][a]["sender"],
            messages[path][a]["socket-id-sender"]
          );
        }
      }
    });

    socket.on("signal", (toId, message) => {
      console.log(`📡 Signal from ${socket.id} to ${toId}`);
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      console.log(`💬 Chat message from ${sender}: ${data}`);
      
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false]
      );

      if (found === true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }

        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });

        console.log(`📤 Broadcasting message to ${connections[matchingRoom].length} clients in room ${matchingRoom}`);

        connections[matchingRoom].forEach((socketId) => {
          io.to(socketId).emit("chat-message", data, sender, socket.id);
        });
      } else {
        console.log(`❌ Room not found for socket ${socket.id}`);
      }
    });

    // Host powers
    socket.on("host-mute-all", (roomId) => {
      console.log(`🔇 Host muting all in room: ${roomId}`);
      if (connections[roomId]) {
        connections[roomId].forEach((socketId) => {
          if (socketId !== socket.id) {
            io.to(socketId).emit("force-mute");
          }
        });
      }
    });

    socket.on("host-end-meeting", (roomId) => {
      console.log(`❌ Host ending meeting in room: ${roomId}`);
      if (connections[roomId]) {
        connections[roomId].forEach((socketId) => {
          io.to(socketId).emit("meeting-ended");
        });
        // Clean up room
        delete connections[roomId];
        delete messages[roomId];
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ USER DISCONNECTED: ${socket.id}`);
      
      let key;
      let disconnectedUser = false;

      for (const [k, v] of Object.entries(connections)) {
        for (let a = 0; a < v.length; ++a) {
          if (v[a] === socket.id) {
            key = k;
            disconnectedUser = true;

            console.log(`👋 User left room: ${key}`);

            // Notify all remaining users
            for (let a = 0; a < connections[key].length; ++a) {
              if (connections[key][a] !== socket.id) {
                io.to(connections[key][a]).emit("user-left", socket.id);
              }
            }

            // Remove from connections
            var index = connections[key].indexOf(socket.id);
            connections[key].splice(index, 1);

            console.log(`📋 Room ${key} now has ${connections[key].length} clients`);

            // Clean up empty rooms
            if (connections[key].length === 0) {
              console.log(`🧹 Cleaning up empty room: ${key}`);
              delete connections[key];
              delete messages[key];
            }

            break;
          }
        }
        if (disconnectedUser) break;
      }

      // Clean up time tracking and username
      delete timeOnline[socket.id];
      delete usernames[socket.id];
    });
  });

  return io;
};