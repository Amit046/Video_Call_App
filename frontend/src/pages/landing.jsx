import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  Chip,
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import PersonIcon from "@mui/icons-material/Person";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareIcon from "@mui/icons-material/Share";
import SecurityIcon from "@mui/icons-material/Security";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import GroupIcon from "@mui/icons-material/Group";

export default function LandingPage() {
  const router = useNavigate();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [showCopied, setShowCopied] = useState(false);

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    setRoomId(randomId);
    setError("");
  };

  const handleJoin = () => {
    if (!username.trim()) {
      setError("Please enter your name!");
      return;
    }
    if (!roomId.trim()) {
      setError("Please enter or generate a room ID!");
      return;
    }
    setError("");
    router(`/${roomId}?username=${encodeURIComponent(username)}`);
  };

  const copyRoomLink = () => {
    if (!roomId.trim()) {
      setError("Please generate or enter a room ID first!");
      return;
    }
    const link = `${window.location.origin}/${roomId}?username=`;
    navigator.clipboard.writeText(link);
    setShowCopied(true);
  };

  const shareRoomLink = async () => {
    if (!roomId.trim()) {
      setError("Please generate or enter a room ID first!");
      return;
    }
    const link = `${window.location.origin}/${roomId}?username=`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my video call!",
          text: `Join me on ApnaVideo! Room ID: ${roomId}`,
          url: link,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      copyRoomLink();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "linear-gradient(135deg, #1e1e2e 0%, #0f0f1e 100%)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Animated Background */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 107, 107, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 195, 113, 0.1) 0%, transparent 50%)
          `,
          animation: "pulse 20s ease-in-out infinite",
        }}
      />

      {/* Navbar */}
      <Box
        sx={{
          position: "relative",
          zIndex: 100,
          padding: "1rem 3rem",
          backdropFilter: "blur(10px)",
          background: "rgba(30, 30, 46, 0.8)",
          borderBottom: "1px solid rgba(255, 107, 107, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <VideocamIcon
            sx={{
              fontSize: "2rem",
              color: "#ff6b6b",
              filter: "drop-shadow(0 0 20px rgba(255, 107, 107, 0.5))",
            }}
          />
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontSize: "1.5rem", color: "#ffffff" }}
          >
            Apna
            <span
              style={{
                background: "linear-gradient(135deg, #ff6b6b 0%, #ff9a9e 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Video
            </span>
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: "0.75rem" }}>
          <Chip
            icon={<SecurityIcon sx={{ fontSize: "1rem" }} />}
            label="Secure"
            size="small"
            sx={{
              background: "rgba(255, 107, 107, 0.1)",
              color: "#ff6b6b",
              border: "1px solid rgba(255, 107, 107, 0.3)",
              fontWeight: 600,
            }}
          />
          <Chip
            icon={<FlashOnIcon sx={{ fontSize: "1rem" }} />}
            label="Fast"
            size="small"
            sx={{
              background: "rgba(255, 195, 113, 0.1)",
              color: "#ffc371",
              border: "1px solid rgba(255, 195, 113, 0.3)",
              fontWeight: 600,
            }}
          />
          <Chip
            icon={<GroupIcon sx={{ fontSize: "1rem" }} />}
            label="Multi-User"
            size="small"
            sx={{
              background: "rgba(120, 119, 198, 0.1)",
              color: "#7877c6",
              border: "1px solid rgba(120, 119, 198, 0.3)",
              fontWeight: 600,
            }}
          />
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 3rem",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
            maxWidth: "1400px",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Left Section - Form */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
              justifyContent: "center",
            }}
          >
            {/* Badge */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "rgba(255, 107, 107, 0.1)",
                border: "1px solid rgba(255, 107, 107, 0.3)",
                borderRadius: "50px",
                width: "fit-content",
                color: "#ff6b6b",
                fontWeight: 600,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: "1rem" }} />
              <Typography variant="caption">No Login Required</Typography>
            </Box>

            {/* Title */}
            <Box>
              <Typography
                sx={{
                  fontSize: "3.5rem",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: "#ffffff",
                  marginBottom: "1rem",
                }}
              >
                Connect with
                <br />
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, #ff6b6b 0%, #ffa07a 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Anyone, Anywhere
                </span>
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.1rem",
                  color: "#c9c9d8",
                  lineHeight: 1.6,
                }}
              >
                Crystal-clear video calls with just a name and room code.
                <br />
                No sign-up, no hassle. Just pure connection.
              </Typography>
            </Box>

            {/* Form */}
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
              <TextField
                fullWidth
                variant="outlined"
                label="Your Name"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: "#ff6b6b" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.1)",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(255, 107, 107, 0.3)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#ff6b6b",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#c9c9d8",
                    "&.Mui-focused": {
                      color: "#ff6b6b",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "#ffffff",
                  },
                }}
              />

              <Box sx={{ display: "flex", gap: "1rem" }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Room ID"
                  placeholder="Enter or generate"
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value.toUpperCase());
                    setError("");
                  }}
                  onKeyPress={handleKeyPress}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MeetingRoomIcon sx={{ color: "#ff6b6b" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "12px",
                      "& fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.1)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(255, 107, 107, 0.3)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#ff6b6b",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "#c9c9d8",
                      "&.Mui-focused": {
                        color: "#ff6b6b",
                      },
                    },
                    "& .MuiInputBase-input": {
                      color: "#ffffff",
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={generateRoomId}
                  sx={{
                    borderColor: "rgba(255, 107, 107, 0.5)",
                    color: "#ff6b6b",
                    minWidth: "130px",
                    fontWeight: 600,
                    textTransform: "none",
                    fontSize: "0.95rem",
                    background: "rgba(255, 107, 107, 0.05)",
                    "&:hover": {
                      background: "rgba(255, 107, 107, 0.15)",
                      borderColor: "#ff6b6b",
                      boxShadow: "0 0 30px rgba(255, 107, 107, 0.3)",
                    },
                  }}
                >
                  <AutoAwesomeIcon sx={{ mr: 0.5, fontSize: "1rem" }} />
                  Generate
                </Button>
              </Box>

              {/* Room Link Share */}
              {roomId && (
                <Box
                  sx={{
                    background: "rgba(120, 119, 198, 0.05)",
                    border: "1px solid rgba(120, 119, 198, 0.2)",
                    borderRadius: "12px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#c9c9d8", display: "block", mb: 0.3 }}
                    >
                      Share this link:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#7877c6",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "0.85rem",
                      }}
                    >
                      {window.location.origin}/{roomId}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={copyRoomLink}
                      sx={{
                        color: "#7877c6",
                        background: "rgba(120, 119, 198, 0.1)",
                        "&:hover": {
                          background: "rgba(120, 119, 198, 0.2)",
                        },
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: "1.1rem" }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={shareRoomLink}
                      sx={{
                        color: "#ff6b6b",
                        background: "rgba(255, 107, 107, 0.1)",
                        "&:hover": {
                          background: "rgba(255, 107, 107, 0.2)",
                        },
                      }}
                    >
                      <ShareIcon sx={{ fontSize: "1.1rem" }} />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {error && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "#ff6b6b",
                    padding: "0.75rem",
                    background: "rgba(255, 107, 107, 0.1)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 107, 107, 0.3)",
                    textAlign: "center",
                  }}
                >
                  ⚠️ {error}
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleJoin}
                sx={{
                  background:
                    "linear-gradient(135deg, #ff6b6b 0%, #ff9a9e 100%)",
                  color: "white",
                  padding: "0.9rem",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: "12px",
                  boxShadow: "0 0 30px rgba(255, 107, 107, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 10px 40px rgba(255, 107, 107, 0.5)",
                  },
                }}
              >
                <VideocamIcon sx={{ mr: 0.5, fontSize: "1.3rem" }} />
                Join Meeting
              </Button>

              <Typography
                variant="caption"
                sx={{
                  color: "#c9c9d8",
                  textAlign: "center",
                  padding: "0.5rem",
                  background: "rgba(255, 195, 113, 0.05)",
                  border: "1px solid rgba(255, 195, 113, 0.2)",
                  borderRadius: "8px",
                }}
              >
                💡 Share the Room ID or link with others to invite them
              </Typography>
            </Box>
          </Box>

          {/* Right Section - Image */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <img
              src="/mobile.png"
              alt="Video Call Interface"
              style={{
                width: "100%",
                maxWidth: "500px",
                height: "auto",
                filter: "drop-shadow(0 20px 60px rgba(255, 107, 107, 0.3))",
                animation: "float 6s ease-in-out infinite",
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={showCopied}
        autoHideDuration={3000}
        onClose={() => setShowCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Link copied to clipboard! 🎉
        </Alert>
      </Snackbar>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </Box>
  );
}
