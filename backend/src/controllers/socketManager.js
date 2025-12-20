import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};
let usernames = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
    // ✅ RENDER PRODUCTION FIX
    transports: ["polling", "websocket"], // polling first!
    allowUpgrades: true,
    upgradeTimeout: 30000,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e6,
    perMessageDeflate: false,
    httpCompression: false,
    cookie: false,
  });

  console.log("🚀 Socket.IO Server Started");

  io.on("connection", (socket) => {
    console.log("\n========================================");
    console.log("✅ NEW CONNECTION");
    console.log("   Socket ID:", socket.id);
    console.log("   Transport:", socket.conn.transport.name);
    console.log("========================================\n");

    socket.on("join-call", (path, username) => {
      console.log(`\n👤 JOIN-CALL REQUEST`);
      console.log(`   User: ${username}`);
      console.log(`   Room: ${path}`);
      console.log(`   Socket: ${socket.id}`);

      // Initialize room if doesn't exist
      if (connections[path] === undefined) {
        connections[path] = [];
        console.log(`   🆕 Created new room: ${path}`);
      }

      // Add user to room
      connections[path].push(socket.id);
      timeOnline[socket.id] = new Date();
      usernames[socket.id] = username || "User";

      console.log(
        `   📋 Room now has ${connections[path].length} participants`
      );
      console.log(`   👥 Participants:`, connections[path]);

      console.log(`   ✅ Join complete\n`);

      // ✅ CRITICAL FIX: Emit AFTER user is added to room
      // Notify ALL users in the room about the new joiner
      console.log(
        `   📤 Broadcasting user-joined to all ${connections[path].length} clients`
      );

      for (let a = 0; a < connections[path].length; a++) {
        const clientId = connections[path][a];

        console.log(`      → Sending to: ${clientId}`);
        console.log(
          `      → Joiner: ${socket.id}, Username: ${username}, Clients: ${connections[path].length}`
        );

        // ✅ FIX: Send username as STRING, not in array format
        io.to(clientId).emit(
          "user-joined",
          socket.id, // ID of user who just joined
          username || "User", // Username as STRING
          [...connections[path]] // Copy of array to avoid reference issues
        );
      }

      console.log(`   ✅ Broadcast complete\n`);

      // Send chat history to new joiner
      if (messages[path] !== undefined && messages[path].length > 0) {
        console.log(
          `   💬 Sending ${messages[path].length} messages to ${socket.id}`
        );
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
      console.log(`📡 SIGNAL: ${socket.id} → ${toId}`);
      try {
        const signal = JSON.parse(message);
        if (signal.sdp) {
          console.log(`   Type: SDP ${signal.sdp.type}`);
        } else if (signal.ice) {
          console.log(`   Type: ICE candidate`);
        }
      } catch (e) {}

      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      console.log(`\n💬 CHAT MESSAGE`);
      console.log(`   From: ${sender} (${socket.id})`);
      console.log(`   Message: ${data}`);

      // Find which room the socket is in
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

        console.log(
          `   📤 Broadcasting to ${connections[matchingRoom].length} clients`
        );

        // Broadcast to everyone in room
        connections[matchingRoom].forEach((socketId) => {
          io.to(socketId).emit("chat-message", data, sender, socket.id);
        });
      } else {
        console.log(`   ❌ Room not found for socket ${socket.id}`);
      }
    });

    // Host powers
    socket.on("host-mute-all", (roomId) => {
      console.log(`\n🔇 HOST MUTE ALL - Room: ${roomId}`);
      if (connections[roomId]) {
        connections[roomId].forEach((socketId) => {
          if (socketId !== socket.id) {
            io.to(socketId).emit("force-mute");
            console.log(`   🔇 Muted ${socketId}`);
          }
        });
      }
    });

    socket.on("host-end-meeting", (roomId) => {
      console.log(`\n❌ HOST END MEETING - Room: ${roomId}`);
      if (connections[roomId]) {
        connections[roomId].forEach((socketId) => {
          io.to(socketId).emit("meeting-ended");
        });
        delete connections[roomId];
        delete messages[roomId];
        console.log(`   🧹 Room ${roomId} cleaned up`);
      }
    });

    socket.on("disconnect", () => {
      console.log("\n========================================");
      console.log("❌ DISCONNECT");
      console.log("   Socket ID:", socket.id);
      console.log("   Username:", usernames[socket.id] || "Unknown");

      let key;
      let disconnectedUser = false;

      // Find and remove from room
      for (const [k, v] of Object.entries(connections)) {
        for (let a = 0; a < v.length; ++a) {
          if (v[a] === socket.id) {
            key = k;
            disconnectedUser = true;

            console.log(`   👋 User left room: ${key}`);

            // Notify remaining users
            for (let b = 0; b < connections[key].length; ++b) {
              if (connections[key][b] !== socket.id) {
                io.to(connections[key][b]).emit("user-left", socket.id);
              }
            }

            // Remove from array
            var index = connections[key].indexOf(socket.id);
            connections[key].splice(index, 1);

            console.log(
              `   📋 Room ${key} now has ${connections[key].length} participants`
            );

            // Clean up empty rooms
            if (connections[key].length === 0) {
              console.log(`   🧹 Cleaning up empty room: ${key}`);
              delete connections[key];
              delete messages[key];
            }

            break;
          }
        }
        if (disconnectedUser) break;
      }

      // Clean up
      delete timeOnline[socket.id];
      delete usernames[socket.id];

      console.log("========================================\n");
    });
  });

  return io;
};
