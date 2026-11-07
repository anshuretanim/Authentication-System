import { Link, useNavigate } from "react-router-dom";
import { AppData } from "../context/context";

const Home = () => {
  const { logoutUser, user } = AppData();
  const navigate = useNavigate();

  return (
    <div className="flex w-[100px] m-auto mt-40">
      <button
        className="bg-red-500 text-white p-2 rounded-md"
        onClick={() => logoutUser(navigate)}
      >
        Logout
      </button>
      {user && user.role === "admin" && (
        <Link to="/dashboard"
          className="bg-green-500 text-white p-2 rounded-md"
          onClick={() => logoutUser(navigate)}
        >
          Dashboard
        </Link>
      )}
    </div>
  );
};

export default Home;
