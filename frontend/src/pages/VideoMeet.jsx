/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import {
  Badge,
  IconButton,
  TextField,
  Box,
  Paper,
  Typography,
  Snackbar,
  Alert,
  Button,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import server from "../environment";
import { useLocation, useParams } from "react-router-dom";

const server_url = server;
const connections = {};

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function VideoMeetComponent() {
  const { url } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const usernameFromUrl = searchParams.get("username");
  const isHostParam = searchParams.get("host") === "true";

  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoref = useRef();
  const messageListenerAttached = useRef(false);

  const [username] = useState(usernameFromUrl || "Anonymous");
  const [isHost, setIsHost] = useState(isHostParam);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [showModal, setModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [videos, setVideos] = useState([]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    console.log("🚀 Component mounted");
    getPermissions();
    
    return () => {
      console.log("🧹 Cleanup");
      Object.values(connections).forEach(conn => {
        if (conn) conn.close();
      });
      if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.off("chat-message");
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  }, [screen]);

  const getPermissions = async () => {
    try {
      console.log("📷 Requesting media permissions...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("✅ Media permissions granted");
      setVideoAvailable(true);
      setAudioAvailable(true);

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      }

      window.localStream = stream;
      if (localVideoref.current) {
        localVideoref.current.srcObject = stream;
      }

      connectToSocketServer();
    } catch (error) {
      console.error("❌ Error getting media permissions:", error);
      showNotification("Please allow camera and microphone access", "error");
      
      let blackSilence = (...args) =>
        new MediaStream([black(...args), silence()]);
      window.localStream = blackSilence();
      if (localVideoref.current) {
        localVideoref.current.srcObject = window.localStream;
      }
      connectToSocketServer();
    }
  };

  const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getUserMediaSuccess)
        .catch((e) => {
          console.error("getUserMedia error:", e);
          showNotification("Error accessing media", "error");
        });
    } else {
      try {
        let tracks = localVideoref.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };

  const getUserMediaSuccess = (stream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {}

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    Object.keys(connections).forEach((id) => {
      if (id === socketIdRef.current) return;

      const pc = connections[id];
      const senders = pc.getSenders();
      senders.forEach(sender => pc.removeTrack(sender));

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.createOffer()
        .then((description) => pc.setLocalDescription(description))
        .then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: pc.localDescription })
          );
        })
        .catch((e) => console.error(e));
    });
  };

  const getDisplayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDisplayMediaSuccess)
          .catch((e) => {
            console.error(e);
            setScreen(false);
            showNotification("Screen sharing cancelled", "info");
          });
      }
    }
  };

  const getDisplayMediaSuccess = (stream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {}

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    Object.keys(connections).forEach((id) => {
      if (id === socketIdRef.current) return;

      const pc = connections[id];
      const senders = pc.getSenders();
      senders.forEach(sender => pc.removeTrack(sender));

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.createOffer()
        .then((description) => pc.setLocalDescription(description))
        .then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: pc.localDescription })
          );
        })
        .catch((e) => console.error(e));
    });

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setScreen(false);
        getUserMedia();
      };
    });
  };

  const gotMessageFromServer = (fromId, message) => {
    console.log("📨 Signal from:", fromId);
    
    try {
      const signal = JSON.parse(message);

      if (fromId === socketIdRef.current) return;

      if (!connections[fromId]) {
        console.log("⚠️ No connection exists for:", fromId);
        return;
      }

      const pc = connections[fromId];

      if (signal.sdp) {
        console.log("📡 Received SDP:", signal.sdp.type, "from:", fromId);
        
        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            console.log("✅ Remote description set for:", fromId);
            if (signal.sdp.type === "offer") {
              console.log("📤 Creating answer for:", fromId);
              return pc.createAnswer();
            }
          })
          .then((description) => {
            if (description) {
              return pc.setLocalDescription(description);
            }
          })
          .then(() => {
            if (signal.sdp.type === "offer") {
              console.log("📤 Sending answer to:", fromId);
              socketRef.current.emit(
                "signal",
                fromId,
                JSON.stringify({ sdp: pc.localDescription })
              );
            }
          })
          .catch((e) => console.error("❌ SDP error:", e));
      }

      if (signal.ice) {
        console.log("🧊 ICE candidate from:", fromId);
        pc.addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.error("❌ ICE error:", e));
      }
    } catch (error) {
      console.error("❌ Signal processing error:", error);
    }
  };

  const createPeerConnection = (socketId, username = "User") => {
    console.log("🔗 Creating peer connection for:", socketId, username);
    
    const pc = new RTCPeerConnection(peerConfigConnections);
    connections[socketId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE to:", socketId);
        socketRef.current.emit(
          "signal",
          socketId,
          JSON.stringify({ ice: event.candidate })
        );
      }
    };

    pc.ontrack = (event) => {
      console.log("🎥 Received track from:", socketId);
      console.log("Stream:", event.streams[0]);
      
      setVideos((prevVideos) => {
        const existingIndex = prevVideos.findIndex(v => v.socketId === socketId);
        
        if (existingIndex !== -1) {
          const updated = [...prevVideos];
          updated[existingIndex] = {
            ...updated[existingIndex],
            stream: event.streams[0],
          };
          console.log("♻️ Updated video for:", socketId);
          return updated;
        } else {
          const newVideo = {
            socketId: socketId,
            stream: event.streams[0],
            username: username || "User",
          };
          console.log("➕ Added new video for:", socketId);
          return [...prevVideos, newVideo];
        }
      });
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🔌 ICE state for ${socketId}:`, pc.iceConnectionState);
      
      if (pc.iceConnectionState === "connected") {
        console.log("✅ Connected to:", socketId);
      } else if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        console.log("❌ Connection failed for:", socketId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state for ${socketId}:`, pc.connectionState);
    };

    // Add local stream tracks
    if (window.localStream) {
      console.log("➕ Adding local tracks to peer:", socketId);
      window.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, window.localStream);
        console.log("✅ Added track:", track.kind);
      });
    }

    return pc;
  };

  const addMessage = useCallback((data, sender, socketIdSender) => {
    console.log("💬 New message:", { data, sender, socketIdSender });
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data, socketId: socketIdSender },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  }, []);

  const connectToSocketServer = () => {
    console.log("🌐 Connecting to server:", server_url);
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      console.log("✅ Connected to server");
      socketIdRef.current = socketRef.current.id;
      console.log("🆔 My socket ID:", socketIdRef.current);
      
      socketRef.current.emit("join-call", url, username);
      console.log("🚪 Joined room:", url, "as", username);

      // Attach message listener only once
      if (!messageListenerAttached.current) {
        console.log("👂 Attaching message listener");
        socketRef.current.on("chat-message", addMessage);
        messageListenerAttached.current = true;
      }

      socketRef.current.on("user-left", (id) => {
        console.log("👋 User left:", id);
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
        
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
        
        showNotification("A user left the call", "info");
      });

      socketRef.current.on("user-joined", (...args) => {
        console.log("👤 User joined event - Raw args:", args);
        
        // Handle different argument patterns
        let id, joinerUsername, clients;
        
        // Pattern 1: (id, username, clients) - Correct
        if (args.length === 3 && typeof args[1] === 'string' && Array.isArray(args[2])) {
          [id, joinerUsername, clients] = args;
        }
        // Pattern 2: (id, clients) - Missing username
        else if (args.length === 2 && Array.isArray(args[1])) {
          [id, clients] = args;
          joinerUsername = "User";
        }
        // Pattern 3: (id, username-as-array, undefined) - Server bug
        else if (args.length === 3 && Array.isArray(args[1])) {
          id = args[0];
          clients = args[1];
          joinerUsername = "User";
        }
        // Fallback
        else {
          console.error("❌ Unknown user-joined format:", args);
          return;
        }
        
        console.log("📋 Parsed data:");
        console.log("   - ID:", id);
        console.log("   - Username:", joinerUsername);
        console.log("   - Clients:", clients);

        if (!Array.isArray(clients)) {
          console.error("❌ Clients is not an array");
          return;
        }

        // Create connections for all clients EXCEPT the new joiner
        clients.forEach((socketListId) => {
          if (socketListId === socketIdRef.current || socketListId === id) {
            console.log("⏭️ Skipping self or new joiner");
            return;
          }

          if (!connections[socketListId]) {
            console.log("🔗 Creating connection for existing peer:", socketListId);
            createPeerConnection(socketListId, "User");
          }
        });

        // If I just joined, create offers to existing peers
        if (id === socketIdRef.current) {
          console.log("🎉 I joined! Creating offers...");
          
          setTimeout(() => {
            const peerIds = Object.keys(connections);
            console.log("📋 Peers to connect:", peerIds);
            
            peerIds.forEach((peerId) => {
              if (peerId === socketIdRef.current) return;

              const pc = connections[peerId];
              console.log("📤 Creating offer to:", peerId);
              
              pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              })
                .then((description) => {
                  console.log("✅ Offer created for:", peerId);
                  return pc.setLocalDescription(description);
                })
                .then(() => {
                  console.log("📤 Sending offer to:", peerId);
                  socketRef.current.emit(
                    "signal",
                    peerId,
                    JSON.stringify({ sdp: pc.localDescription })
                  );
                })
                .catch((e) => console.error("❌ Offer error:", e));
            });
          }, 1000);
        } else {
          // Someone else joined
          console.log("👋 New user joined:", joinerUsername);
          
          // Only create connection if we don't have one already
          if (!connections[id]) {
            console.log("🔗 Creating connection for new joiner:", id);
            createPeerConnection(id, joinerUsername);
          }
          
          showNotification(`${joinerUsername} joined`, "success");
        }
      });
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      showNotification("Disconnected from server", "error");
    });
  };

  const silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const handleVideo = () => setVideo(!video);
  const handleAudio = () => setAudio(!audio);
  const handleScreen = () => setScreen(!screen);

  const handleEndCall = () => {
    try {
      if (localVideoref.current && localVideoref.current.srcObject) {
        localVideoref.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      
      Object.values(connections).forEach(conn => {
        if (conn) conn.close();
      });
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    } catch (e) {
      console.error(e);
    }
    window.location.href = "/";
  };

  const closeChat = () => {
    setModal(false);
    setNewMessages(0);
  };

  const sendMessage = () => {
    if (message.trim() === "") return;
    console.log("📤 Sending message:", message);
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  const showNotification = (message, severity = "info") => {
    setNotification({ open: true, message, severity });
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const muteAllParticipants = () => {
    if (isHost) {
      socketRef.current.emit("host-mute-all", url);
      showNotification("Muted all participants", "info");
    }
    handleMenuClose();
  };

  const endMeetingForAll = () => {
    if (isHost) {
      if (window.confirm("End meeting for all participants?")) {
        socketRef.current.emit("host-end-meeting", url);
        handleEndCall();
      }
    }
    handleMenuClose();
  };

  return (
    <Box
      sx={{
        height: "100vh",
        bgcolor: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          bgcolor: "#2d2d2d",
          borderBottom: "2px solid #00d4ff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" sx={{ color: "white", fontWeight: "bold" }}>
            🎥 Room: {url}
          </Typography>
          {isHost && (
            <Chip 
              label="HOST" 
              color="primary" 
              size="small"
              sx={{ bgcolor: "#00d4ff", fontWeight: "bold" }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body1" sx={{ color: "white" }}>
            {username} ({videos.length} others)
          </Typography>
          {isHost && (
            <>
              <IconButton 
                onClick={handleMenuOpen}
                sx={{ color: "white" }}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={muteAllParticipants}>
                  🔇 Mute All Participants
                </MenuItem>
                <MenuItem onClick={endMeetingForAll} sx={{ color: "red" }}>
                  ❌ End Meeting for All
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>

      {/* Main Video Area */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Center - Other Users Grid */}
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns:
              videos.length <= 1
                ? "1fr"
                : videos.length <= 4
                ? "repeat(2, 1fr)"
                : "repeat(3, 1fr)",
            gap: 2,
            p: 2,
            alignContent: "center",
          }}
        >
          {videos.map((video) => (
            <Paper
              key={video.socketId}
              sx={{
                position: "relative",
                bgcolor: "#000",
                borderRadius: 2,
                overflow: "hidden",
                aspectRatio: "16/9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                data-socket={video.socketId}
                ref={(ref) => {
                  if (ref && video.stream) {
                    ref.srcObject = video.stream;
                  }
                }}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  bgcolor: "rgba(0,0,0,0.7)",
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                <Typography sx={{ color: "white", fontSize: "0.9rem" }}>
                  {video.username || "User"}
                </Typography>
              </Box>
            </Paper>
          ))}
          {videos.length === 0 && (
            <Box
              sx={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                fontSize: "1.2rem",
              }}
            >
              Waiting for others to join...
            </Box>
          )}
        </Box>

        {/* Host Video - Small Corner */}
        <Box
          sx={{
            position: "absolute",
            bottom: 80,
            right: 20,
            width: { xs: 150, sm: 200, md: 250 },
            aspectRatio: "16/9",
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            border: "2px solid #00d4ff",
            bgcolor: "#000",
            zIndex: 10,
          }}
        >
          <video
            ref={localVideoref}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 5,
              left: 5,
              bgcolor: "rgba(0,0,0,0.7)",
              px: 1,
              py: 0.3,
              borderRadius: 1,
            }}
          >
            <Typography sx={{ color: "white", fontSize: "0.75rem" }}>
              You {isHost && "(Host)"}
            </Typography>
          </Box>
        </Box>

        {/* Chat Panel */}
        {showModal && (
          <Paper
            sx={{
              position: "absolute",
              right: 20,
              top: 20,
              width: { xs: "90%", sm: 350 },
              height: "70%",
              display: "flex",
              flexDirection: "column",
              zIndex: 20,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid #ddd",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6">Chat</Typography>
              <IconButton size="small" onClick={closeChat}>
                ✕
              </IconButton>
            </Box>

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {messages.length === 0 ? (
                <Typography sx={{ color: "#999", textAlign: "center", mt: 4 }}>
                  No messages yet
                </Typography>
              ) : (
                messages.map((item, index) => (
                  <Box
                    key={`${item.socketId}-${index}`}
                    sx={{
                      alignSelf:
                        item.socketId === socketIdRef.current
                          ? "flex-end"
                          : "flex-start",
                      maxWidth: "80%",
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor:
                          item.socketId === socketIdRef.current
                            ? "#00d4ff"
                            : "#f0f0f0",
                        color:
                          item.socketId === socketIdRef.current
                            ? "white"
                            : "black",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: "bold", display: "block" }}
                      >
                        {item.sender}
                      </Typography>
                      <Typography variant="body2">{item.data}</Typography>
                    </Paper>
                  </Box>
                ))
              )}
            </Box>

            <Box
              sx={{
                p: 2,
                borderTop: "1px solid #ddd",
                display: "flex",
                gap: 1,
              }}
            >
              <TextField
                fullWidth
                size="small"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button
                variant="contained"
                onClick={sendMessage}
                sx={{ bgcolor: "#00d4ff" }}
              >
                Send
              </Button>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Bottom Controls */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          p: 2,
          bgcolor: "#2d2d2d",
        }}
      >
        <IconButton
          onClick={handleVideo}
          sx={{
            bgcolor: video ? "rgba(255,255,255,0.1)" : "rgba(244,67,54,0.8)",
            "&:hover": {
              bgcolor: video ? "rgba(255,255,255,0.2)" : "rgba(244,67,54,1)",
            },
          }}
        >
          {video ? (
            <VideocamIcon sx={{ color: "white" }} />
          ) : (
            <VideocamOffIcon sx={{ color: "white" }} />
          )}
        </IconButton>

        <IconButton
          onClick={handleAudio}
          sx={{
            bgcolor: audio ? "rgba(255,255,255,0.1)" : "rgba(244,67,54,0.8)",
            "&:hover": {
              bgcolor: audio ? "rgba(255,255,255,0.2)" : "rgba(244,67,54,1)",
            },
          }}
        >
          {audio ? (
            <MicIcon sx={{ color: "white" }} />
          ) : (
            <MicOffIcon sx={{ color: "white" }} />
          )}
        </IconButton>

        {screenAvailable && (
          <IconButton
            onClick={handleScreen}
            sx={{
              bgcolor: screen ? "#00d4ff" : "rgba(255,255,255,0.1)",
              "&:hover": {
                bgcolor: screen ? "#0066ff" : "rgba(255,255,255,0.2)",
              },
            }}
          >
            {screen ? (
              <StopScreenShareIcon sx={{ color: "white" }} />
            ) : (
              <ScreenShareIcon sx={{ color: "white" }} />
            )}
          </IconButton>
        )}

        <IconButton
          onClick={handleEndCall}
          sx={{
            bgcolor: "rgba(244,67,54,0.8)",
            "&:hover": { bgcolor: "rgba(244,67,54,1)" },
          }}
        >
          <CallEndIcon sx={{ color: "white" }} />
        </IconButton>

        <Badge badgeContent={newMessages} color="error">
          <IconButton
            onClick={() => {
              setModal(!showModal);
              if (!showModal) setNewMessages(0);
            }}
            sx={{
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <ChatIcon sx={{ color: "white" }} />
          </IconButton>
        </Badge>
      </Box>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={notification.severity} sx={{ width: "100%" }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}