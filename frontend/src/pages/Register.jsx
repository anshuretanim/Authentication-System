import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { server } from "../main";


const Register = () => {

  const [ email, setEmail ] = useState("");
  const [ password, setPassword ] = useState(""); 
  const [btnLoading, setBtnLoading] = useState(false);
  const [name, setName] = useState("");

  const submitHandler = async(e)=>{
    setBtnLoading(true);
    e.preventDefault(); //"don't reload the page pls."
    try{
      const {data} = await axios.post( //send a post request to backend
        `${server}/api/v1/register`, //location of the Endpoint receiving the request.
        {name, email,password} //Axios sends this data to your Express backend.
      );
      //we use {data} because Axios returns a response object containing several properties like data, status, headers
      toast.success(data.message);
      setName("");
      setEmail("");
    }catch(error){
      toast.error(error.response?.data?.message || "Something went wrong");
    }finally{ //This block executes regardless of whether the request succeeds or fails.
      setBtnLoading(false);
    }
  }

  return (
    <section className="text-gray-600 body-font">
      <div className="container px-5 py-24 mx-auto flex flex-wrap items-center">
        <div className="lg:w-3/5 md:w-1/2 md:pr-16 lg:pr-0 pr-0">
          <h1 className="title-font font-medium text-3xl text-gray-900">
          Let's get you registered.
          </h1>
        </div>
        <form onSubmit = {submitHandler} className="lg:w-2/6 md:w-1/2 bg-gray-100 rounded-lg p-8 flex flex-col md:ml-auto w-full mt-10 md:mt-0">
          <h2 className="text-gray-900 text-lg font-medium title-font mb-5">
            Sign Up
          </h2>

                    <div className="relative mb-4">
            <label htmlFor="name" className="leading-7 text-sm text-gray-600">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="w-full bg-white rounded border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              required
            />
          </div>

          <div className="relative mb-4">
            <label htmlFor="email" className="leading-7 text-sm text-gray-600">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="w-full bg-white rounded border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative mb-4">
            <label htmlFor="password" className="leading-7 text-sm text-gray-600">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="w-full bg-white rounded border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
            />
          </div>


          <button className="text-white bg-green-500 border-0 py-2 px-8 focus:outline-none hover:bg-green-600 rounded text-lg" disabled={btnLoading}>
           {btnLoading?"Submitting...":"Submit"}
          </button>
          <Link to={"/login"} className="text-xs text-gray-500 mt-3">
            Already have an account?
          </Link>
        </form>
      </div>
    </section>
  );
};

export default Register;
