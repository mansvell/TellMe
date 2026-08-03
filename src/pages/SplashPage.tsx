import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Logo.png";

export default function SplashPage() {

    const navigate = useNavigate();

    useEffect(() => {

        const timer = setTimeout(() => {

            navigate("/welcome");

        },5000);

        return ()=>clearTimeout(timer);

    },[]);

    return (
        <div className="fixed inset-0 z-40 flex flex-col bg-cover bg-center bg-no-repeat overflow-hidden"
                 style={{backgroundImage: `url(${logo})`}}>

        </div>

);

}