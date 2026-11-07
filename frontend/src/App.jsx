import { Routes, BrowserRouter, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Verify from "./pages/Verify";
import VerifyOtp from "./pages/VerifyOtp";
import { ToastContainer } from "react-toastify";
import Loading from "../src/Loading";
import { AppData } from "./context/context";
import Dashboard from "./pages/Dashboard";

const App = () => {
  const { isAuth, loading } = AppData();
  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={isAuth? <Home />:<Login/>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={isAuth? <Home/> : <Register />} />
            <Route path="/verifyotp" element={isAuth?<VerifyOtp />:<VerifyOtp/>} />
            <Route path="/token/:token" element={isAuth?<Home />:<Verify />} /> 
            <Route path="/dashboard" element={isAuth?<Dashboard />:<Login />} />          
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      )}
    </>
  );
};

export default App;
