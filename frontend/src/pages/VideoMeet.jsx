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
import FlipCameraIosIcon from "@mui/icons-material/FlipCameraIos"; // ✅ NEW: Back camera icon
import server from "../environment";
import { useLocation, useParams } from "react-router-dom";

const server_url = server;
const connections = {};

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
  const [facingMode, setFacingMode] = useState("user"); // ✅ NEW: Track camera facing mode

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
        video: { ...HD_VIDEO_CONSTRAINTS, facingMode },
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
          video: video ? { ...HD_VIDEO_CONSTRAINTS, facingMode } : false,
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

  // ✅ NEW: Switch camera function
  const handleSwitchCamera = async () => {
    try {
      console.log("📷 Switching camera from", facingMode);
      const newFacingMode = facingMode === "user" ? "environment" : "user";
      setFacingMode(newFacingMode);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { ...HD_VIDEO_CONSTRAINTS, facingMode: newFacingMode },
        audio: false, // Don't restart audio
      });

      // Stop old video tracks
      if (window.localStream) {
        window.localStream.getVideoTracks().forEach((track) => track.stop());
      }

      // Replace video track
      const videoTrack = stream.getVideoTracks()[0];
      const audioTracks = window.localStream?.getAudioTracks() || [];

      window.localStream = new MediaStream([videoTrack, ...audioTracks]);
      localVideoref.current.srcObject = window.localStream;

      // Update peer connections
      Object.keys(connections).forEach((id) => {
        if (id === socketIdRef.current) return;

        const pc = connections[id];
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === "video");

        if (videoSender) {
          videoSender.replaceTrack(videoTrack).catch((e) => console.error(e));
        }
      });

      showNotification(
        `Switched to ${newFacingMode === "user" ? "front" : "back"} camera`,
        "success"
      );
    } catch (error) {
      console.error("❌ Camera switch error:", error);
      showNotification("Could not switch camera", "error");
    }
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
  };
  // ✅ FIXED: Return JSX with mobile full screen support
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
          p: { xs: 1, sm: 2 }, // ✅ Smaller padding on mobile
          bgcolor: "#2d2d2d",
          borderBottom: "2px solid #00d4ff",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}
        >
          <Typography
            variant="h6"
            sx={{
              color: "white",
              fontWeight: "bold",
              fontSize: { xs: "0.9rem", sm: "1.25rem" },
            }}
          >
            🎥 Room: {url}
          </Typography>
          {isHost && (
            <Chip
              label="HOST"
              color="primary"
              size="small"
              sx={{
                bgcolor: "#00d4ff",
                fontWeight: "bold",
                fontSize: { xs: "0.65rem", sm: "0.8125rem" },
              }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="body1"
            sx={{ color: "white", fontSize: { xs: "0.75rem", sm: "1rem" } }}
          >
            {username} ({videos.length})
          </Typography>
          {isHost && (
            <>
              <IconButton
                onClick={handleMenuOpen}
                sx={{ color: "white", p: { xs: 0.5, sm: 1 } }}
              >
                <MoreVertIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={muteAllParticipants}>🔇 Mute All</MenuItem>
                <MenuItem onClick={endMeetingForAll} sx={{ color: "red" }}>
                  ❌ End Meeting
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>

      {/* ✅ FIXED: Main Video Area - Full screen on mobile */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* ✅ FIXED: Video Grid - Mobile optimized */}
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr", // ✅ Always 1 column on mobile
              sm: videos.length <= 1 ? "1fr" : "repeat(2, 1fr)",
              md:
                videos.length <= 2
                  ? "repeat(2, 1fr)"
                  : "repeat(auto-fit, minmax(400px, 1fr))",
            },
            gap: { xs: 1, sm: 2 },
            p: { xs: 1, sm: 2 },
            alignContent: { xs: "start", sm: "center" },
            justifyContent: "center",
            height: "100%",
            width: "100%",
            overflow: "auto",
          }}
        >
          {videos.map((video) => (
            <Paper
              key={video.socketId}
              sx={{
                position: "relative",
                bgcolor: "#000",
                borderRadius: { xs: 1, sm: 2 },
                overflow: "hidden",
                aspectRatio: "16/9",
                width: "100%",
                height: "100%",
                minHeight: {
                  xs: "calc(100vh - 150px)", // ✅ Full height on mobile
                  sm: "350px",
                  md: "450px",
                },
                maxHeight: {
                  xs: "calc(100vh - 150px)", // ✅ Full height on mobile
                  sm: "calc(100vh - 180px)",
                },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0, 212, 255, 0.3)",
                border: { xs: "1px solid #00d4ff", sm: "2px solid #00d4ff" },
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
                  objectFit: "contain",
                  background: "#000",
                }}
              />
              {/* ✅ FIXED: Username label - Always visible */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: { xs: 8, sm: 10 },
                  left: { xs: 8, sm: 10 },
                  bgcolor: "rgba(0,0,0,0.85)",
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.5, sm: 0.5 },
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backdropFilter: "blur(10px)",
                  zIndex: 2, // ✅ Ensure label is visible
                }}
              >
                <Box
                  sx={{
                    width: { xs: 6, sm: 8 },
                    height: { xs: 6, sm: 8 },
                    borderRadius: "50%",
                    bgcolor: "#4CAF50",
                  }}
                />
                <Typography
                  sx={{
                    color: "white",
                    fontSize: { xs: "0.75rem", sm: "0.9rem" },
                    fontWeight: 600,
                  }}
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
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                gap: 2,
                minHeight: { xs: "60vh", sm: "400px" },
              }}
            >
              <Typography fontSize={{ xs: "1.2rem", sm: "1.5rem" }}>
                Waiting for others...
              </Typography>
              <Typography
                fontSize={{ xs: "0.85rem", sm: "1rem" }}
                sx={{ color: "#999", textAlign: "center", px: 2 }}
              >
                Room: <strong style={{ color: "#00d4ff" }}>{url}</strong>
              </Typography>
            </Box>
          )}
        </Box>

        {/* ✅ FIXED: Local Video - Better mobile size */}
        <Box
          sx={{
            position: "absolute",
            bottom: { xs: 70, sm: 90 },
            right: { xs: 10, sm: 20 },
            width: { xs: "100px", sm: "180px", md: "220px" }, // ✅ Smaller on mobile
            aspectRatio: "4/3",
            borderRadius: { xs: 1, sm: 2 },
            overflow: "hidden",
            boxShadow: "0 4px 15px rgba(0, 212, 255, 0.5)",
            border: { xs: "2px solid #00d4ff", sm: "3px solid #00d4ff" },
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
              transform: facingMode === "user" ? "scaleX(-1)" : "none", // ✅ Mirror only front camera
              background: "#000",
            }}
          />
          {/* ✅ Username label for local video */}
          <Box
            sx={{
              position: "absolute",
              bottom: 4,
              left: 4,
              bgcolor: "rgba(0,0,0,0.9)",
              px: { xs: 1, sm: 1.5 },
              py: 0.5,
              borderRadius: 1,
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography
              sx={{
                color: "white",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
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
              right: { xs: 10, sm: 20 },
              top: { xs: 10, sm: 20 },
              width: { xs: "calc(100% - 20px)", sm: 380 },
              height: { xs: "calc(100% - 20px)", sm: "75%" },
              maxHeight: { xs: "calc(100% - 20px)", sm: "calc(100vh - 180px)" },
              display: "flex",
              flexDirection: "column",
              zIndex: 20,
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
              border: "2px solid #00d4ff",
            }}
          >
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderBottom: "2px solid #00d4ff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: "#2d2d2d",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: { xs: "1rem", sm: "1.25rem" },
                }}
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
                p: { xs: 1.5, sm: 2 },
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
                <Typography
                  sx={{
                    color: "#999",
                    textAlign: "center",
                    mt: 4,
                    fontSize: { xs: "0.85rem", sm: "1rem" },
                  }}
                >
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
                        p: { xs: 1, sm: 1.5 },
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
                        sx={{
                          fontWeight: "bold",
                          display: "block",
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                        }}
                      >
                        {item.sender}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                      >
                        {item.data}
                      </Typography>
                    </Paper>
                  </Box>
                ))
              )}
            </Box>

            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
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
                placeholder="Message..."
                autoComplete="off"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "white",
                    fontSize: { xs: "0.85rem", sm: "1rem" },
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
                  minWidth: { xs: "60px", sm: "80px" },
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
              >
                Send
              </Button>
            </Box>
          </Paper>
        )}
      </Box>

      {/* ✅ FIXED: Bottom Controls - Mobile optimized with flip camera */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: { xs: 1, sm: 2 },
          p: { xs: 1.5, sm: 2 },
          bgcolor: "#2d2d2d",
          flexWrap: "nowrap",
          flexShrink: 0,
          borderTop: "2px solid #00d4ff",
          overflowX: "auto",
        }}
      >
        <IconButton
          onClick={handleVideo}
          sx={{
            bgcolor: video ? "rgba(255,255,255,0.1)" : "rgba(244,67,54,0.9)",
            width: { xs: 45, sm: 56 },
            height: { xs: 45, sm: 56 },
            "&:hover": {
              bgcolor: video ? "rgba(255,255,255,0.2)" : "rgba(244,67,54,1)",
            },
          }}
        >
          {video ? (
            <VideocamIcon
              sx={{ color: "white", fontSize: { xs: 20, sm: 24 } }}
            />
          ) : (
            <VideocamOffIcon
              sx={{ color: "white", fontSize: { xs: 20, sm: 24 } }}
            />
          )}
        </IconButton>

        <IconButton
          onClick={handleAudio}
          sx={{
            bgcolor: audio ? "rgba(255,255,255,0.1)" : "rgba(244,67,54,0.9)",
            width: { xs: 45, sm: 56 },
            height: { xs: 45, sm: 56 },
            "&:hover": {
              bgcolor: audio ? "rgba(255,255,255,0.2)" : "rgba(244,67,54,1)",
            },
          }}
        >
          {audio ? (
            <MicIcon sx={{ color: "white", fontSize: { xs: 20, sm: 24 } }} />
          ) : (
            <MicOffIcon sx={{ color: "white", fontSize: { xs: 20, sm: 24 } }} />
          )}
        </IconButton>

        {/* ✅ NEW: Flip Camera Button (Mobile Only) */}
        <IconButton
          onClick={handleSwitchCamera}
          sx={{
            bgcolor: "rgba(255,255,255,0.1)",
            width: { xs: 45, sm: 56 },
            height: { xs: 45, sm: 56 },
            display: { xs: "flex", md: "none" }, // Show only on mobile
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.2)",
            },
          }}
        >
          <FlipCameraIosIcon
            sx={{ color: "white", fontSize: { xs: 20, sm: 24 } }}
          />
        </IconButton>

        {screenAvailable && (
          <IconButton
            onClick={handleScreen}
            sx={{
              bgcolor: screen ? "#00d4ff" : "rgba(255,255,255,0.1)",
              width: { xs: 45, sm: 56 },
              height: { xs: 45, sm: 56 },
              display: { xs: "none", sm: "flex" },
              "&:hover": {
                bgcolor: screen ? "#0099cc" : "rgba(255,255,255,0.2)",
              },
            }}
          >
            {screen ? (
              <StopScreenShareIcon sx={{ color: "white", fontSize: 24 }} />
            ) : (
              <ScreenShareIcon sx={{ color: "white", fontSize: 24 }} />
            )}
          </IconButton>
        )}

        <IconButton
          onClick={handleEndCall}
          sx={{
            bgcolor: "rgba(244,67,54,0.9)",
            width: { xs: 45, sm: 56 },
            height: { xs: 45, sm: 56 },
            "&:hover": {
              bgcolor: "rgba(244,67,54,1)",
            },
          }}
        >
          <CallEndIcon sx={{ color: "white", fontSize: { xs: 20, sm: 24 } }} />
        </IconButton>

        <Badge badgeContent={newMessages} color="error">
          <IconButton
            onClick={() => {
              setModal(!showModal);
              if (!showModal) setNewMessages(0);
            }}
            sx={{
              bgcolor: showModal ? "#00d4ff" : "rgba(255,255,255,0.1)",
              width: { xs: 45, sm: 56 },
              height: { xs: 45, sm: 56 },
              "&:hover": {
                bgcolor: showModal ? "#0099cc" : "rgba(255,255,255,0.2)",
              },
            }}
          >
            <ChatIcon sx={{ color: "white", fontSize: { xs: 20, sm: 24 } }} />
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
