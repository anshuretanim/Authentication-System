import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import {server} from "../main";
import { toast } from "react-toastify";
import api from "../apiInterceptor";

const AppContext = createContext(null);

export const AppProvider = ({children})=>{
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);

    async function fetchUser(){
        setLoading(true);
        try{
            const { data } = await axios.get(`${server}/api/v1/me`, {
                withCredentials: true
            });

            setUser(data.user)
            setIsAuth(true)


        }catch(err){
            setUser(null);
            setIsAuth(false);
            console.log(err);
        }finally{
            setLoading(false);
        }
    }

    async function logoutUser(navigate){
        try{
            const {data} = await api.post("/api/v1/logout")
            toast.success(data.message);
            setIsAuth(false);
            setUser(null);
            navigate("/login");
        }catch(error){
            toast.error("Something went wrong.");
        }
    }

    useEffect(()=>{
        fetchUser()
    }, []);

    return <AppContext.Provider value={{setIsAuth, isAuth, user, setUser, loading, logoutUser}}>{ children }</AppContext.Provider>
};

export const AppData = () => {
    const context = useContext(AppContext)

    if(!context) throw new Error("AppData must be used within an AppProvider")
        return context;
    }