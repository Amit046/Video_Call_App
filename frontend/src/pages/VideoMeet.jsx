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

// ✅ FIX 1: BETTER HD VIDEO CONSTRAINTS
const HD_VIDEO_CONSTRAINTS = {
  width: { ideal: 1920, min: 1280 },
  height: { ideal: 1080, min: 720 },
  frameRate: { ideal: 30, min: 24 },
  facingMode: "user",
  aspectRatio: 16 / 9,
};

const HD_AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 2,
};

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
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
  const [connectionQuality, setConnectionQuality] = useState({});

  console.log("🎬 Component Render - Room:", url, "Username:", username);

  useEffect(() => {
    console.log("🚀 Component mounted");
    getPermissions();

    return () => {
      console.log("🧹 Cleanup");
      Object.values(connections).forEach((conn) => {
        if (conn) conn.close();
      });
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
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
        video: HD_VIDEO_CONSTRAINTS,
        audio: HD_AUDIO_CONSTRAINTS,
      });

      console.log("✅ Media permissions granted");
      console.log("   Video tracks:", stream.getVideoTracks().length);
      console.log("   Audio tracks:", stream.getAudioTracks().length);

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
    if (window.localStream) {
      const videoTracks = window.localStream.getVideoTracks();
      const audioTracks = window.localStream.getAudioTracks();

      console.log("🎛️ Toggling tracks - Video:", video, "Audio:", audio);

      videoTracks.forEach((track) => {
        track.enabled = video;
        console.log(`   Video track enabled: ${video}`);
      });

      audioTracks.forEach((track) => {
        track.enabled = audio;
        console.log(`   Audio track enabled: ${audio}`);
      });

      return;
    }

    if ((video && videoAvailable) || (audio && audioAvailable)) {
      console.log("🎥 Getting NEW user media - Video:", video, "Audio:", audio);

      navigator.mediaDevices
        .getUserMedia({
          video: video ? HD_VIDEO_CONSTRAINTS : false,
          audio: audio ? HD_AUDIO_CONSTRAINTS : false,
        })
        .then(getUserMediaSuccess)
        .catch((e) => {
          console.error("getUserMedia error:", e);
          showNotification("Error accessing media", "error");
        });
    }
  };

  const getUserMediaSuccess = (stream) => {
    console.log("✅ getUserMedia success");

    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {}

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    console.log("🔄 Updating peer connections with new stream");

    Object.keys(connections).forEach((id) => {
      if (id === socketIdRef.current) return;

      const pc = connections[id];
      console.log(`   Updating connection: ${id}`);

      const senders = pc.getSenders();

      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          console.log(`      🔄 Replacing ${track.kind} track`);
          sender.replaceTrack(track).catch((e) => {
            console.error("      ❌ Replace track error:", e);
          });
        } else {
          console.log(`      ➕ Adding ${track.kind} track`);
          pc.addTrack(track, stream);
        }
      });

      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
        .then((description) => pc.setLocalDescription(description))
        .then(() => {
          console.log(`      📤 Sending offer to ${id}`);
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
          .getDisplayMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
            audio: true,
          })
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
    console.log("🖥️ Screen share started");

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

      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch((e) => {
            console.error("Replace track error:", e);
          });
        } else {
          pc.addTrack(track, stream);
        }
      });

      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
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

      if (fromId === socketIdRef.current) {
        console.log("   ⏭️ Ignoring signal from self");
        return;
      }

      if (!connections[fromId]) {
        console.log("   ⚠️ No connection exists for:", fromId);
        return;
      }

      const pc = connections[fromId];

      if (signal.sdp) {
        console.log("   📡 Received SDP:", signal.sdp.type, "from:", fromId);

        const currentState = pc.signalingState;
        console.log("   📊 Current signaling state:", currentState);

        if (signal.sdp.type === "offer") {
          if (
            currentState === "stable" ||
            currentState === "have-remote-offer"
          ) {
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
              .then(() => {
                console.log("   ✅ Remote description set for:", fromId);
                console.log("   📤 Creating answer for:", fromId);
                return pc.createAnswer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                });
              })
              .then((description) => {
                if (description) {
                  return pc.setLocalDescription(description);
                }
              })
              .then(() => {
                console.log("   📤 Sending answer to:", fromId);
                socketRef.current.emit(
                  "signal",
                  fromId,
                  JSON.stringify({ sdp: pc.localDescription })
                );
              })
              .catch((e) => console.error("   ❌ SDP error:", e));
          } else {
            console.log("   ⚠️ Ignoring offer - wrong state:", currentState);
          }
        } else if (signal.sdp.type === "answer") {
          if (currentState === "have-local-offer") {
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
              .then(() => {
                console.log("   ✅ Answer set successfully for:", fromId);
              })
              .catch((e) => console.error("   ❌ Answer error:", e));
          } else {
            console.log("   ⚠️ Ignoring answer - wrong state:", currentState);
          }
        }
      }

      if (signal.ice) {
        console.log("   🧊 ICE candidate from:", fromId);
        pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) =>
          console.error("   ❌ ICE error:", e)
        );
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
        console.log("   🧊 Sending ICE to:", socketId);
        socketRef.current.emit(
          "signal",
          socketId,
          JSON.stringify({ ice: event.candidate })
        );
      }
    };

    pc.ontrack = (event) => {
      console.log("   🎥 Received track from:", socketId);
      console.log("   Track kind:", event.track.kind);
      console.log("   Stream:", event.streams[0].id);

      setVideos((prevVideos) => {
        const existingIndex = prevVideos.findIndex(
          (v) => v.socketId === socketId
        );

        if (existingIndex !== -1) {
          const updated = [...prevVideos];
          updated[existingIndex] = {
            ...updated[existingIndex],
            stream: event.streams[0],
          };
          console.log("   ♻️ Updated video for:", socketId);
          return updated;
        } else {
          const newVideo = {
            socketId: socketId,
            stream: event.streams[0],
            username: username || "User",
          };
          console.log("   ➕ Added new video for:", socketId);
          return [...prevVideos, newVideo];
        }
      });
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`   🔌 ICE state [${socketId}]: ${pc.iceConnectionState}`);

      const state = pc.iceConnectionState;
      setConnectionQuality((prev) => ({
        ...prev,
        [socketId]:
          state === "connected"
            ? "good"
            : state === "checking"
            ? "checking"
            : "poor",
      }));

      if (pc.iceConnectionState === "connected") {
        console.log("   ✅ Connected to:", socketId);
        const senders = pc.getSenders();
        senders.forEach((sender) => {
          if (sender.track && sender.track.kind === "video") {
            const params = sender.getParameters();
            if (!params.encodings) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = 5000000;
            params.encodings[0].maxFramerate = 30;
            params.encodings[0].scaleResolutionDownBy = 1;
            params.encodings[0].priority = "high";
            sender
              .setParameters(params)
              .then(() => console.log("      ✅ Video bitrate: 5 Mbps"))
              .catch((e) => console.log("      ⚠️ Bitrate setting failed:", e));
          }
          if (sender.track && sender.track.kind === "audio") {
            const params = sender.getParameters();
            if (!params.encodings) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = 128000;
            params.encodings[0].priority = "high";
            sender
              .setParameters(params)
              .catch((e) => console.log("Audio bitrate error:", e));
          }
        });
      } else if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        console.log("   ❌ Connection issue for:", socketId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(
        `   🔗 Connection state [${socketId}]: ${pc.connectionState}`
      );
    };

    if (window.localStream) {
      console.log("   ➕ Adding local tracks to peer:", socketId);
      window.localStream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, window.localStream);
        console.log("      ✅ Added track:", track.kind);

        if (track.kind === "video") {
          const params = sender.getParameters();
          if (!params.encodings) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 5000000;
          params.encodings[0].maxFramerate = 30;
          params.encodings[0].scaleResolutionDownBy = 1;
          params.encodings[0].priority = "high";
          sender
            .setParameters(params)
            .catch((e) => console.log("      ⚠️ Bitrate error:", e));
        }
        if (track.kind === "audio") {
          const params = sender.getParameters();
          if (!params.encodings) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 128000;
          params.encodings[0].priority = "high";
          sender
            .setParameters(params)
            .catch((e) => console.log("      ⚠️ Audio bitrate error:", e));
        }
      });
    }

    return pc;
  };

  const addMessage = useCallback((data, sender, socketIdSender) => {
    console.log("💬 New message:", { data, sender, socketIdSender });

    setMessages((prevMessages) => {
      const isDuplicate = prevMessages.some(
        (msg) =>
          msg.data === data &&
          msg.sender === sender &&
          msg.socketId === socketIdSender
      );

      if (isDuplicate) {
        console.log("   ⚠️ Duplicate message, skipping");
        return prevMessages;
      }

      return [
        ...prevMessages,
        { sender: sender, data: data, socketId: socketIdSender },
      ];
    });

    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  }, []);
  const connectToSocketServer = () => {
    console.log("\n🌐 Connecting to socket server:", server_url);
    console.log("   Using HTTPS:", server_url.startsWith("https"));

    socketRef.current = io.connect(server_url, {
      secure: server_url.startsWith("https"),
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 45000,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true,
      path: "/socket.io/",
    });

    console.log("   ✅ Socket instance created");
    console.log("   Transport:", socketRef.current.io.opts.transports);

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      console.log("\n✅ Connected to server");
      socketIdRef.current = socketRef.current.id;
      console.log("🆔 My socket ID:", socketIdRef.current);

      console.log("📞 Joining room:", url, "as", username);
      socketRef.current.emit("join-call", url, username);

      if (!messageListenerAttached.current) {
        console.log("👂 Attaching message listener");
        socketRef.current.on("chat-message", addMessage);
        messageListenerAttached.current = true;
      }

      socketRef.current.on("user-left", (id) => {
        console.log("\n👋 User left:", id);

        const leftUser = videos.find((v) => v.socketId === id);
        const leftUsername = leftUser?.username || "A user";

        setVideos((videos) => videos.filter((video) => video.socketId !== id));

        if (connections[id]) {
          console.log("   Closing connection:", id);
          connections[id].close();
          delete connections[id];
        }

        showNotification(`${leftUsername} left the call`, "info");
      });

      socketRef.current.on("user-joined", (...args) => {
        console.log("\n👤 USER-JOINED EVENT - RAW ARGS:", args);
        console.log(
          "   Arg types:",
          args.map((a) => typeof a)
        );

        let id, joinerUsername, clients;

        if (args.length === 3) {
          id = args[0];
          joinerUsername = args[1];
          clients = args[2];

          console.log(
            "   Raw username:",
            joinerUsername,
            "Type:",
            typeof joinerUsername
          );

          if (Array.isArray(joinerUsername)) {
            console.log("   ⚠️ Username is array, using clients instead");
            clients = joinerUsername;
            joinerUsername = "User";
          } else if (typeof joinerUsername !== "string") {
            console.log("   ⚠️ Username not a string, converting");
            joinerUsername = String(joinerUsername || "User");
          }

          if (!Array.isArray(clients)) {
            console.error("   ❌ Clients not array, checking args[1]");
            if (Array.isArray(args[1])) {
              clients = args[1];
              joinerUsername = "User";
            } else {
              return;
            }
          }
        } else if (args.length === 2) {
          id = args[0];
          clients = args[1];
          joinerUsername = "User";
        } else {
          console.error("   ❌ Unknown argument format!");
          return;
        }

        console.log("   ✅ FINAL PARSED:");
        console.log("      Joiner ID:", id);
        console.log(
          "      Username:",
          joinerUsername,
          "(type:",
          typeof joinerUsername,
          ")"
        );
        console.log("      Clients:", clients);
        console.log("      My ID:", socketIdRef.current);

        if (!Array.isArray(clients)) {
          console.error("   ❌ Clients is STILL not an array:", typeof clients);
          return;
        }

        if (id === socketIdRef.current) {
          console.log(
            "   🎉 I JOINED! Setting up connections to existing peers..."
          );

          clients.forEach((socketListId) => {
            if (socketListId === socketIdRef.current) {
              console.log("      ⏭️ Skipping self");
              return;
            }

            if (!connections[socketListId]) {
              console.log(
                "      🔗 Creating connection to existing peer:",
                socketListId
              );
              createPeerConnection(socketListId, "User");
            } else {
              console.log("      ✅ Connection already exists:", socketListId);
            }
          });

          setTimeout(() => {
            const peerIds = Object.keys(connections);
            console.log("   📤 Creating offers to", peerIds.length, "peers");

            peerIds.forEach((peerId) => {
              if (peerId === socketIdRef.current) return;

              const pc = connections[peerId];
              console.log("      Creating offer to:", peerId);

              pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              })
                .then((description) => {
                  console.log("         ✅ Offer created");
                  return pc.setLocalDescription(description);
                })
                .then(() => {
                  console.log("         📤 Sending offer");
                  socketRef.current.emit(
                    "signal",
                    peerId,
                    JSON.stringify({ sdp: pc.localDescription })
                  );
                })
                .catch((e) => console.error("         ❌ Offer error:", e));
            });
          }, 1000);
        } else {
          console.log(
            "   👋 Another user joined with username:",
            joinerUsername
          );

          const cleanUsername = String(joinerUsername).trim() || "User";
          console.log("   📝 Clean username for notification:", cleanUsername);

          if (!connections[id]) {
            console.log("      🔗 Creating connection to new joiner:", id);
            createPeerConnection(id, cleanUsername);
          } else {
            console.log("      ✅ Connection already exists to:", id);
          }

          console.log(
            "      📢 Showing notification:",
            `${cleanUsername} joined the call`
          );
          showNotification(`${cleanUsername} joined the call`, "success");
        }
      });
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      showNotification("Disconnected from server", "error");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
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

  const handleVideo = () => {
    console.log("🎥 Toggle video from", video, "to", !video);
    const newVideoState = !video;
    setVideo(newVideoState);

    if (window.localStream) {
      const videoTracks = window.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = newVideoState;
        console.log(`   Set video track enabled: ${newVideoState}`);
      });
    }
  };

  const handleAudio = () => {
    console.log("🎤 Toggle audio from", audio, "to", !audio);
    const newAudioState = !audio;
    setAudio(newAudioState);

    if (window.localStream) {
      const audioTracks = window.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = newAudioState;
        console.log(`   Set audio track enabled: ${newAudioState}`);
      });
    }
  };

  const handleScreen = () => {
    console.log("🖥️ Toggle screen:", !screen);
    setScreen(!screen);
  };

  const handleEndCall = () => {
    console.log("📞 Ending call");
    try {
      if (localVideoref.current && localVideoref.current.srcObject) {
        localVideoref.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }

      Object.values(connections).forEach((conn) => {
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

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && message.trim()) {
      e.preventDefault();
      sendMessage();
    }
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
  }; // ✅ MAIN FIX: Updated return JSX with proper video sizing
  // ✅ FIXED: Complete return JSX with proper face visibility
  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        bgcolor: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
          flexShrink: 0,
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
              <IconButton onClick={handleMenuOpen} sx={{ color: "white" }}>
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

      {/* ✅ FIXED: Main Video Area with CONTAIN for full face visibility */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* ✅ FIXED: Center - Full Screen Video Grid with CONTAIN */}
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns:
              videos.length === 0
                ? "1fr"
                : videos.length === 1
                ? "1fr"
                : videos.length === 2
                ? "repeat(2, 1fr)"
                : videos.length === 3
                ? "repeat(2, 1fr)"
                : videos.length === 4
                ? "repeat(2, 1fr)"
                : "repeat(auto-fit, minmax(500px, 1fr))",
            gridTemplateRows:
              videos.length === 0
                ? "1fr"
                : videos.length <= 2
                ? "1fr"
                : "repeat(auto-fit, minmax(400px, 1fr))",
            gap: 2,
            p: 2,
            alignContent: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            overflow: "auto",
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-track": {
              bgcolor: "#1a1a1a",
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#00d4ff",
              borderRadius: "4px",
            },
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
                width: "100%",
                height: "100%",
                minHeight: {
                  xs: "250px",
                  sm: "400px",
                  md: "500px",
                },
                maxHeight: "calc(100vh - 180px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0, 212, 255, 0.3)",
                border: "2px solid #00d4ff",
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
                  objectFit: "contain", // ✅ CHANGED from "cover" to "contain" for full face visibility
                  background: "#000",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  bgcolor: "rgba(0,0,0,0.8)",
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#4CAF50",
                  }}
                />
                <Typography
                  sx={{ color: "white", fontSize: "0.9rem", fontWeight: 600 }}
                >
                  {video.username || "User"}
                </Typography>
              </Box>
            </Paper>
          ))}
          {videos.length === 0 && (
            <Box
              sx={{
                gridColumn: "1 / -1",
                gridRow: "1 / -1",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                gap: 2,
                minHeight: "400px",
              }}
            >
              <Typography fontSize="1.5rem">
                Waiting for others to join...
              </Typography>
              <Typography fontSize="1rem" sx={{ color: "#999" }}>
                Share Room ID:{" "}
                <strong style={{ color: "#00d4ff" }}>{url}</strong>
              </Typography>
            </Box>
          )}
        </Box>

        {/* ✅ FIXED: Local Video - Better sizing with CONTAIN for mobile */}
        <Box
          sx={{
            position: "absolute",
            bottom: { xs: 80, sm: 90 },
            right: { xs: 15, sm: 20 },
            width: { xs: "140px", sm: "220px", md: "280px" }, // ✅ REDUCED for mobile
            aspectRatio: "4/3", // ✅ CHANGED back to 4/3 for better mobile view
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: "0 6px 30px rgba(0, 212, 255, 0.5)",
            border: "3px solid #00d4ff",
            bgcolor: "#000",
            zIndex: 10,
            cursor: "grab",
            "&:active": { cursor: "grabbing" },
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
              objectFit: "contain", // ✅ CHANGED from "cover" to "contain"
              transform: "scaleX(-1)",
              background: "#000",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 6,
              left: 6,
              bgcolor: "rgba(0,0,0,0.9)",
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography
              sx={{
                color: "white",
                fontSize: { xs: "0.65rem", sm: "0.8rem" },
                fontWeight: 600,
              }}
            >
              You {isHost && "👑"}
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
              width: { xs: "90%", sm: 400 },
              height: "75%",
              maxHeight: "calc(100vh - 180px)",
              display: "flex",
              flexDirection: "column",
              zIndex: 20,
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
              border: "2px solid #00d4ff",
            }}
          >
            <Box
              sx={{
                p: 2,
                borderBottom: "2px solid #00d4ff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: "#2d2d2d",
              }}
            >
              <Typography
                variant="h6"
                sx={{ color: "white", fontWeight: "bold" }}
              >
                Chat
              </Typography>
              <IconButton
                size="small"
                onClick={closeChat}
                sx={{ color: "white" }}
              >
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
                bgcolor: "#f5f5f5",
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "#00d4ff",
                  borderRadius: "3px",
                },
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
                      elevation={2}
                      sx={{
                        p: 1.5,
                        bgcolor:
                          item.socketId === socketIdRef.current
                            ? "#00d4ff"
                            : "white",
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
                borderTop: "2px solid #00d4ff",
                display: "flex",
                gap: 1,
                bgcolor: "#2d2d2d",
              }}
            >
              <TextField
                fullWidth
                size="small"
                value={message}
                onChange={handleMessageChange}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                autoComplete="off"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "white",
                    "& fieldset": {
                      borderColor: "#00d4ff",
                    },
                    "&:hover fieldset": {
                      borderColor: "#00d4ff",
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={sendMessage}
                disabled={!message.trim()}
                sx={{
                  bgcolor: "#00d4ff",
                  "&:hover": { bgcolor: "#0099cc" },
                  minWidth: "80px",
                }}
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
          gap: { xs: 1.5, sm: 2 },
          p: { xs: 2, sm: 2.5 },
          bgcolor: "#2d2d2d",
          flexWrap: "wrap",
          flexShrink: 0,
          borderTop: "2px solid #00d4ff",
        }}
      >
        <IconButton
          onClick={handleVideo}
          sx={{
            bgcolor: video ? "rgba(255,255,255,0.1)" : "rgba(244,67,54,0.9)",
            width: { xs: 50, sm: 60 },
            height: { xs: 50, sm: 60 },
            "&:hover": {
              bgcolor: video ? "rgba(255,255,255,0.2)" : "rgba(244,67,54,1)",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease",
          }}
        >
          {video ? (
            <VideocamIcon
              sx={{ color: "white", fontSize: { xs: 22, sm: 26 } }}
            />
          ) : (
            <VideocamOffIcon
              sx={{ color: "white", fontSize: { xs: 22, sm: 26 } }}
            />
          )}
        </IconButton>

        <IconButton
          onClick={handleAudio}
          sx={{
            bgcolor: audio ? "rgba(255,255,255,0.1)" : "rgba(244,67,54,0.9)",
            width: { xs: 50, sm: 60 },
            height: { xs: 50, sm: 60 },
            "&:hover": {
              bgcolor: audio ? "rgba(255,255,255,0.2)" : "rgba(244,67,54,1)",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease",
          }}
        >
          {audio ? (
            <MicIcon sx={{ color: "white", fontSize: { xs: 22, sm: 26 } }} />
          ) : (
            <MicOffIcon sx={{ color: "white", fontSize: { xs: 22, sm: 26 } }} />
          )}
        </IconButton>

        {screenAvailable && (
          <IconButton
            onClick={handleScreen}
            sx={{
              bgcolor: screen ? "#00d4ff" : "rgba(255,255,255,0.1)",
              width: { xs: 50, sm: 60 },
              height: { xs: 50, sm: 60 },
              display: { xs: "none", sm: "flex" },
              "&:hover": {
                bgcolor: screen ? "#0099cc" : "rgba(255,255,255,0.2)",
                transform: "scale(1.05)",
              },
              transition: "all 0.2s ease",
            }}
          >
            {screen ? (
              <StopScreenShareIcon sx={{ color: "white", fontSize: 26 }} />
            ) : (
              <ScreenShareIcon sx={{ color: "white", fontSize: 26 }} />
            )}
          </IconButton>
        )}

        <IconButton
          onClick={handleEndCall}
          sx={{
            bgcolor: "rgba(244,67,54,0.9)",
            width: { xs: 50, sm: 60 },
            height: { xs: 50, sm: 60 },
            "&:hover": {
              bgcolor: "rgba(244,67,54,1)",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease",
          }}
        >
          <CallEndIcon sx={{ color: "white", fontSize: { xs: 22, sm: 26 } }} />
        </IconButton>

        <Badge badgeContent={newMessages} color="error">
          <IconButton
            onClick={() => {
              setModal(!showModal);
              if (!showModal) setNewMessages(0);
            }}
            sx={{
              bgcolor: showModal ? "#00d4ff" : "rgba(255,255,255,0.1)",
              width: { xs: 50, sm: 60 },
              height: { xs: 50, sm: 60 },
              "&:hover": {
                bgcolor: showModal ? "#0099cc" : "rgba(255,255,255,0.2)",
                transform: "scale(1.05)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <ChatIcon sx={{ color: "white", fontSize: { xs: 22, sm: 26 } }} />
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

// Helper functions remain same
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