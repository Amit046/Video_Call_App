import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

// ✅ NAMED EXPORTS (IMPORTANT)
export const AuthContext = createContext(null);

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const router = useNavigate();

  // ✅ REGISTER
  const handleRegister = async (name, username, password) => {
    try {
      const request = await client.post("/register", {
        name,
        username,
        password,
      });

      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (err) {
      throw err;
    }
  };

  // ✅ LOGIN
  const handleLogin = async (username, password) => {
    try {
      const request = await client.post("/login", {
        username,
        password,
      });

      if (request.status === httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
        setUserData(request.data.user);
        router("/home");
      }
    } catch (err) {
      throw err;
    }
  };

  // ✅ GET HISTORY
  const getHistoryOfUser = async () => {
    const token = localStorage.getItem("token");

    const request = await client.get("/get_all_activity", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return request.data;
  };

  // ✅ ADD TO HISTORY
  const addToUserHistory = async (meetingCode) => {
    const token = localStorage.getItem("token");

    const request = await client.post(
      "/add_to_activity",
      { meeting_code: meetingCode },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return request.data;
  };

  return (
    <AuthContext.Provider
      value={{
        userData,
        setUserData,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
