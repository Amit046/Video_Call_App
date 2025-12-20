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
    const link = `${window.location.origin}/${roomId}`;
    navigator.clipboard.writeText(link);
    setShowCopied(true);
  };

  const shareRoomLink = async () => {
    if (!roomId.trim()) {
      setError("Please generate or enter a room ID first!");
      return;
    }
    const link = `${window.location.origin}/${roomId}`;

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
        background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Animated Background with Multiple Layers */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 107, 107, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(120, 119, 198, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 195, 113, 0.15) 0%, transparent 50%)
          `,
          animation: "pulse 20s ease-in-out infinite",
        }}
      />

      {/* Background Image on Left Side - Enhanced */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "55%",
          height: "100%",
          backgroundImage: "url(/background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center right",
          opacity: 0.25,
          zIndex: 1,
          maskImage:
            "linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
        }}
      />

      {/* Decorative Blur Circles */}
      <Box
        sx={{
          position: "absolute",
          top: "20%",
          left: "10%",
          width: "300px",
          height: "300px",
          background:
            "radial-gradient(circle, rgba(255, 107, 107, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          borderRadius: "50%",
          animation: "float 8s ease-in-out infinite",
          zIndex: 1,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "20%",
          right: "15%",
          width: "250px",
          height: "250px",
          background:
            "radial-gradient(circle, rgba(120, 119, 198, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          borderRadius: "50%",
          animation: "float 10s ease-in-out infinite reverse",
          zIndex: 1,
        }}
      />

      {/* Navbar - Enhanced */}
      <Box
        sx={{
          position: "relative",
          zIndex: 100,
          padding: "1.25rem 3rem",
          backdropFilter: "blur(20px)",
          background: "rgba(20, 20, 36, 0.85)",
          borderBottom: "1px solid rgba(255, 107, 107, 0.25)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <VideocamIcon
            sx={{
              fontSize: "2.2rem",
              color: "#ff6b6b",
              filter: "drop-shadow(0 0 25px rgba(255, 107, 107, 0.6))",
              animation: "glow 2s ease-in-out infinite",
            }}
          />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontSize: "1.6rem",
              color: "#ffffff",
              letterSpacing: "-0.5px",
            }}
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
              background: "rgba(255, 107, 107, 0.15)",
              color: "#ff8a8a",
              border: "1px solid rgba(255, 107, 107, 0.4)",
              fontWeight: 600,
              backdropFilter: "blur(10px)",
            }}
          />
          <Chip
            icon={<FlashOnIcon sx={{ fontSize: "1rem" }} />}
            label="Fast"
            size="small"
            sx={{
              background: "rgba(255, 195, 113, 0.15)",
              color: "#ffd399",
              border: "1px solid rgba(255, 195, 113, 0.4)",
              fontWeight: 600,
              backdropFilter: "blur(10px)",
            }}
          />
          <Chip
            icon={<GroupIcon sx={{ fontSize: "1rem" }} />}
            label="Multi-User"
            size="small"
            sx={{
              background: "rgba(120, 119, 198, 0.15)",
              color: "#9d9cdb",
              border: "1px solid rgba(120, 119, 198, 0.4)",
              fontWeight: 600,
              backdropFilter: "blur(10px)",
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
            gap: "5rem",
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
              position: "relative",
              zIndex: 20,
            }}
          >
            {/* Badge - Enhanced */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.2rem",
                background: "rgba(255, 107, 107, 0.15)",
                border: "1px solid rgba(255, 107, 107, 0.4)",
                borderRadius: "50px",
                width: "fit-content",
                color: "#ff8a8a",
                fontWeight: 700,
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(255, 107, 107, 0.2)",
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: "1.1rem" }} />
              <Typography variant="caption" sx={{ fontSize: "0.85rem" }}>
                No Login Required
              </Typography>
            </Box>

            {/* Title - Enhanced */}
            <Box>
              <Typography
                sx={{
                  fontSize: "3.75rem",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: "#ffffff",
                  marginBottom: "1.2rem",
                  letterSpacing: "-1.5px",
                  textShadow: "0 2px 20px rgba(255, 107, 107, 0.2)",
                }}
              >
                Connect with
                <br />
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, #ff6b6b 0%, #ffa07a 50%, #ff6b6b 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    backgroundSize: "200% auto",
                    animation: "shimmer 3s linear infinite",
                  }}
                >
                  Anyone, Anywhere
                </span>
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.15rem",
                  color: "#d4d4e0",
                  lineHeight: 1.7,
                  fontWeight: 400,
                }}
              >
                Cover a distance by Apna Video Call
                <br />
                No sign-up, no hassle. Just pure connection.
              </Typography>
            </Box>

            {/* Form - Enhanced */}
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: "1.3rem" }}
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
                      <PersonIcon
                        sx={{ color: "#ff6b6b", fontSize: "1.4rem" }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    background: "rgba(255, 255, 255, 0.06)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "14px",
                    transition: "all 0.3s ease",
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      borderWidth: "1.5px",
                    },
                    "&:hover": {
                      background: "rgba(255, 255, 255, 0.08)",
                      "& fieldset": {
                        borderColor: "rgba(255, 107, 107, 0.4)",
                      },
                    },
                    "&.Mui-focused": {
                      background: "rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 0 0 3px rgba(255, 107, 107, 0.15)",
                      "& fieldset": {
                        borderColor: "#ff6b6b",
                        borderWidth: "1.5px",
                      },
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#d4d4e0",
                    fontWeight: 500,
                    "&.Mui-focused": {
                      color: "#ff6b6b",
                      fontWeight: 600,
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "#ffffff",
                    fontSize: "1rem",
                    padding: "14px 14px 14px 0",
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
                        <MeetingRoomIcon
                          sx={{ color: "#ff6b6b", fontSize: "1.4rem" }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(255, 255, 255, 0.06)",
                      backdropFilter: "blur(10px)",
                      borderRadius: "14px",
                      transition: "all 0.3s ease",
                      "& fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.12)",
                        borderWidth: "1.5px",
                      },
                      "&:hover": {
                        background: "rgba(255, 255, 255, 0.08)",
                        "& fieldset": {
                          borderColor: "rgba(255, 107, 107, 0.4)",
                        },
                      },
                      "&.Mui-focused": {
                        background: "rgba(255, 255, 255, 0.08)",
                        boxShadow: "0 0 0 3px rgba(255, 107, 107, 0.15)",
                        "& fieldset": {
                          borderColor: "#ff6b6b",
                          borderWidth: "1.5px",
                        },
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "#d4d4e0",
                      fontWeight: 500,
                      "&.Mui-focused": {
                        color: "#ff6b6b",
                        fontWeight: 600,
                      },
                    },
                    "& .MuiInputBase-input": {
                      color: "#ffffff",
                      fontSize: "1rem",
                      padding: "14px 14px 14px 0",
                      fontWeight: 600,
                      letterSpacing: "1px",
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={generateRoomId}
                  sx={{
                    borderColor: "rgba(255, 107, 107, 0.6)",
                    color: "#ff6b6b",
                    minWidth: "140px",
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "0.95rem",
                    background: "rgba(255, 107, 107, 0.08)",
                    backdropFilter: "blur(10px)",
                    borderWidth: "1.5px",
                    borderRadius: "14px",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      background: "rgba(255, 107, 107, 0.2)",
                      borderColor: "#ff6b6b",
                      borderWidth: "1.5px",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 30px rgba(255, 107, 107, 0.35)",
                    },
                  }}
                >
                  <AutoAwesomeIcon sx={{ mr: 0.7, fontSize: "1.1rem" }} />
                  Generate
                </Button>
              </Box>

              {/* Room Link Share - Enhanced */}
              {roomId && (
                <Box
                  sx={{
                    background: "rgba(120, 119, 198, 0.08)",
                    backdropFilter: "blur(15px)",
                    border: "1.5px solid rgba(120, 119, 198, 0.3)",
                    borderRadius: "14px",
                    padding: "1rem 1.2rem",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: "0 4px 20px rgba(120, 119, 198, 0.15)",
                    animation: "slideIn 0.4s ease-out",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#b8b8d8",
                        display: "block",
                        mb: 0.4,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      Share this link:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#9d9cdb",
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "0.9rem",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {window.location.origin}/{roomId}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.6 }}>
                    <IconButton
                      size="small"
                      onClick={copyRoomLink}
                      sx={{
                        color: "#9d9cdb",
                        background: "rgba(120, 119, 198, 0.15)",
                        padding: "8px",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          background: "rgba(120, 119, 198, 0.3)",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: "1.2rem" }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={shareRoomLink}
                      sx={{
                        color: "#ff8a8a",
                        background: "rgba(255, 107, 107, 0.15)",
                        padding: "8px",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          background: "rgba(255, 107, 107, 0.3)",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      <ShareIcon sx={{ fontSize: "1.2rem" }} />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {error && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "#ff8a8a",
                    padding: "0.9rem",
                    background: "rgba(255, 107, 107, 0.12)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(255, 107, 107, 0.4)",
                    textAlign: "center",
                    fontWeight: 600,
                    animation: "shake 0.4s ease",
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
                    "linear-gradient(135deg, #ff6b6b 0%, #ff8585 50%, #ff9a9e 100%)",
                  color: "white",
                  padding: "1rem",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: "14px",
                  boxShadow: "0 8px 35px rgba(255, 107, 107, 0.4)",
                  transition: "all 0.3s ease",
                  letterSpacing: "0.3px",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 12px 45px rgba(255, 107, 107, 0.6)",
                    background:
                      "linear-gradient(135deg, #ff5252 0%, #ff6b6b 50%, #ff8585 100%)",
                  },
                  "&:active": {
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <VideocamIcon sx={{ mr: 0.7, fontSize: "1.4rem" }} />
                Join Meeting
              </Button>

              <Typography
                variant="caption"
                sx={{
                  color: "#d4d4e0",
                  textAlign: "center",
                  padding: "0.7rem",
                  background: "rgba(255, 195, 113, 0.08)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 195, 113, 0.25)",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                💡 Share the Room ID or link with others to invite them
              </Typography>
            </Box>
          </Box>

          {/* Right Section - Image - Enhanced */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              position: "relative",
              zIndex: 15,
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: "550px",
              }}
            >
              {/* Glow effect behind mobile */}
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "120%",
                  height: "120%",
                  background:
                    "radial-gradient(circle, rgba(255, 107, 107, 0.3) 0%, transparent 70%)",
                  filter: "blur(80px)",
                  animation: "pulse 4s ease-in-out infinite",
                  zIndex: -1,
                }}
              />
              <img
                src="/mobile.png"
                alt="Video Call Interface"
                style={{
                  width: "100%",
                  height: "auto",
                  filter: "drop-shadow(0 25px 70px rgba(255, 107, 107, 0.4))",
                  animation: "float 6s ease-in-out infinite",
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Snackbar - Enhanced */}
      <Snackbar
        open={showCopied}
        autoHideDuration={3000}
        onClose={() => setShowCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          sx={{
            width: "100%",
            backdropFilter: "blur(10px)",
            background: "rgba(76, 175, 80, 0.95)",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          Link copied to clipboard! 🎉
        </Alert>
      </Snackbar>

      {/* CSS Animations - Enhanced */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(1deg); }
        }
        
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 25px rgba(255, 107, 107, 0.6)); }
          50% { filter: drop-shadow(0 0 35px rgba(255, 107, 107, 0.9)); }
        }
        
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateY(-10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </Box>
  );
}
