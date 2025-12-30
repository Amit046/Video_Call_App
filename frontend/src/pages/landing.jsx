import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  Chip,
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import PersonIcon from "@mui/icons-material/Person";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SecurityIcon from "@mui/icons-material/Security";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import GroupIcon from "@mui/icons-material/Group";

export default function LandingPage() {
  const router = useNavigate();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

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
            radial-gradient(circle at 80% 70%, rgba(120, 119, 198, 0.15) 0%, transparent 50%)
          `,
          animation: "pulse 20s ease-in-out infinite",
        }}
      />

      {/* Decorative Blur Circles */}
      <Box
        sx={{
          position: "absolute",
          top: "20%",
          left: "8%",
          width: { xs: "150px", md: "250px" },
          height: { xs: "150px", md: "250px" },
          background:
            "radial-gradient(circle, rgba(255, 107, 107, 0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
          borderRadius: "50%",
          animation: "float 8s ease-in-out infinite",
          zIndex: 1,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "20%",
          right: "8%",
          width: { xs: "130px", md: "200px" },
          height: { xs: "130px", md: "200px" },
          background:
            "radial-gradient(circle, rgba(120, 119, 198, 0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
          borderRadius: "50%",
          animation: "float 10s ease-in-out infinite reverse",
          zIndex: 1,
        }}
      />

      {/* Navbar - Fixed Height */}
      <Box
        sx={{
          position: "relative",
          zIndex: 100,
          height: { xs: "60px", sm: "70px", md: "80px" },
          padding: { xs: "0 1rem", sm: "0 1.5rem", md: "0 2.5rem" },
          backdropFilter: "blur(20px)",
          background: "rgba(20, 20, 36, 0.85)",
          borderBottom: "1px solid rgba(255, 107, 107, 0.25)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <VideocamIcon
            sx={{
              fontSize: { xs: "1.4rem", sm: "1.8rem", md: "2rem" },
              color: "#ff6b6b",
              filter: "drop-shadow(0 0 20px rgba(255, 107, 107, 0.5))",
            }}
          />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1rem", sm: "1.3rem", md: "1.5rem" },
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
        <Box sx={{ display: "flex", gap: "0.4rem" }}>
          <Chip
            icon={<SecurityIcon sx={{ fontSize: "0.9rem" }} />}
            label="Secure"
            size="small"
            sx={{
              background: "rgba(255, 107, 107, 0.15)",
              color: "#ff8a8a",
              border: "1px solid rgba(255, 107, 107, 0.4)",
              fontWeight: 600,
              backdropFilter: "blur(10px)",
              fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" },
              height: { xs: "20px", sm: "22px", md: "24px" },
            }}
          />
          <Chip
            icon={<FlashOnIcon sx={{ fontSize: "0.9rem" }} />}
            label="Fast"
            size="small"
            sx={{
              background: "rgba(255, 195, 113, 0.15)",
              color: "#ffd399",
              border: "1px solid rgba(255, 195, 113, 0.4)",
              fontWeight: 600,
              backdropFilter: "blur(10px)",
              fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" },
              height: { xs: "20px", sm: "22px", md: "24px" },
            }}
          />
          <Chip
            icon={<GroupIcon sx={{ fontSize: "0.9rem" }} />}
            label="Multi-User"
            size="small"
            sx={{
              background: "rgba(120, 119, 198, 0.15)",
              color: "#9d9cdb",
              border: "1px solid rgba(120, 119, 198, 0.4)",
              fontWeight: 600,
              backdropFilter: "blur(10px)",
              fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" },
              height: { xs: "20px", sm: "22px", md: "24px" },
            }}
          />
        </Box>
      </Box>

      {/* Main Content - Fixed Layout */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          zIndex: 10,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: { xs: 0, lg: "3rem" },
          alignItems: "center",
          padding: { xs: "1rem", sm: "1.5rem", md: "2rem 3rem" },
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {/* Left Section - Form */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: "0.8rem", sm: "1rem", md: "1.3rem" },
            justifyContent: "center",
            position: "relative",
            zIndex: 20,
            maxWidth: { xs: "100%", lg: "550px" },
            margin: "0 auto",
          }}
        >
          {/* Badge */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: {
                xs: "0.4rem 0.9rem",
                sm: "0.5rem 1rem",
                md: "0.6rem 1.2rem",
              },
              background: "rgba(255, 107, 107, 0.15)",
              border: "1px solid rgba(255, 107, 107, 0.4)",
              borderRadius: "50px",
              width: "fit-content",
              color: "#ff8a8a",
              fontWeight: 700,
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(255, 107, 107, 0.2)",
              alignSelf: { xs: "center", lg: "flex-start" },
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: { xs: "0.85rem", md: "1rem" } }} />
            <Typography
              variant="caption"
              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.85rem" } }}
            >
              No Login Required
            </Typography>
          </Box>

          {/* Title */}
          <Box sx={{ textAlign: { xs: "center", lg: "left" } }}>
            <Typography
              sx={{
                fontSize: {
                  xs: "1.6rem",
                  sm: "2rem",
                  md: "2.5rem",
                  lg: "3rem",
                },
                fontWeight: 900,
                lineHeight: 1.1,
                color: "#ffffff",
                marginBottom: { xs: "0.4rem", md: "0.6rem" },
                letterSpacing: "-1px",
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
                fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                color: "#d4d4e0",
                lineHeight: 1.5,
                fontWeight: 400,
              }}
            >
              Crystal-clear video calls with just a name and room code.
              <br />
              No sign-up, no hassle. Just pure connection.
            </Typography>
          </Box>

          {/* Form */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: "0.8rem", md: "1rem" },
            }}
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
                      sx={{
                        color: "#ff6b6b",
                        fontSize: { xs: "1.1rem", md: "1.3rem" },
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: "rgba(255, 255, 255, 0.06)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "12px",
                  "& fieldset": {
                    borderColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255, 107, 107, 0.4)",
                  },
                  "&.Mui-focused": {
                    background: "rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 0 0 3px rgba(255, 107, 107, 0.15)",
                    "& fieldset": {
                      borderColor: "#ff6b6b",
                    },
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "#d4d4e0",
                  fontSize: { xs: "0.85rem", md: "0.95rem" },
                  "&.Mui-focused": {
                    color: "#ff6b6b",
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#ffffff",
                  fontSize: { xs: "0.85rem", md: "0.95rem" },
                  padding: { xs: "10px 10px 10px 0", md: "12px 12px 12px 0" },
                },
              }}
            />

            <Box sx={{ display: "flex", gap: { xs: "0.6rem", md: "0.8rem" } }}>
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
                        sx={{
                          color: "#ff6b6b",
                          fontSize: { xs: "1.1rem", md: "1.3rem" },
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    background: "rgba(255, 255, 255, 0.06)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "12px",
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      borderWidth: "1.5px",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(255, 107, 107, 0.4)",
                    },
                    "&.Mui-focused": {
                      background: "rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 0 0 3px rgba(255, 107, 107, 0.15)",
                      "& fieldset": {
                        borderColor: "#ff6b6b",
                      },
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#d4d4e0",
                    fontSize: { xs: "0.85rem", md: "0.95rem" },
                    "&.Mui-focused": {
                      color: "#ff6b6b",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "#ffffff",
                    fontSize: { xs: "0.85rem", md: "0.95rem" },
                    padding: { xs: "10px 10px 10px 0", md: "12px 12px 12px 0" },
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
                  minWidth: { xs: "90px", md: "110px" },
                  fontWeight: 700,
                  textTransform: "none",
                  fontSize: { xs: "0.8rem", md: "0.9rem" },
                  background: "rgba(255, 107, 107, 0.08)",
                  backdropFilter: "blur(10px)",
                  borderWidth: "1.5px",
                  borderRadius: "12px",
                  padding: { xs: "6px 10px", md: "8px 14px" },
                  "&:hover": {
                    background: "rgba(255, 107, 107, 0.2)",
                    borderColor: "#ff6b6b",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 30px rgba(255, 107, 107, 0.35)",
                  },
                }}
              >
                <AutoAwesomeIcon
                  sx={{ mr: 0.4, fontSize: { xs: "0.9rem", md: "1rem" } }}
                />
                Generate
              </Button>
            </Box>

            {error && (
              <Typography
                variant="body2"
                sx={{
                  color: "#ff8a8a",
                  padding: { xs: "0.6rem", md: "0.7rem" },
                  background: "rgba(255, 107, 107, 0.12)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "10px",
                  border: "1.5px solid rgba(255, 107, 107, 0.4)",
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: { xs: "0.8rem", md: "0.85rem" },
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
                padding: { xs: "0.7rem", md: "0.85rem" },
                fontSize: { xs: "0.95rem", md: "1.05rem" },
                fontWeight: 800,
                textTransform: "none",
                borderRadius: "12px",
                boxShadow: "0 8px 35px rgba(255, 107, 107, 0.4)",
                letterSpacing: "0.3px",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 12px 45px rgba(255, 107, 107, 0.6)",
                  background:
                    "linear-gradient(135deg, #ff5252 0%, #ff6b6b 50%, #ff8585 100%)",
                },
              }}
            >
              <VideocamIcon
                sx={{ mr: 0.6, fontSize: { xs: "1.1rem", md: "1.3rem" } }}
              />
              Join Meeting
            </Button>

            <Typography
              variant="caption"
              sx={{
                color: "#d4d4e0",
                textAlign: "center",
                padding: { xs: "0.5rem", md: "0.6rem" },
                background: "rgba(255, 195, 113, 0.08)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 195, 113, 0.25)",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.8rem" },
              }}
            >
              💡 Share the Room ID with others to invite them
            </Typography>
          </Box>
        </Box>

        {/* Right Section - Image */}
        <Box
          sx={{
            display: { xs: "none", lg: "flex" },
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
              maxWidth: "500px",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "120%",
                height: "120%",
                background:
                  "radial-gradient(circle, rgba(255, 107, 107, 0.25) 0%, transparent 70%)",
                filter: "blur(60px)",
                animation: "pulse 4s ease-in-out infinite",
                zIndex: -1,
              }}
            />
            <img
              src="/mobile.png"
              alt="Video Call"
              style={{
                width: "100%",
                height: "auto",
                filter: "drop-shadow(0 15px 40px rgba(255, 107, 107, 0.3))",
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
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
