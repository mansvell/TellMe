import { motion } from "motion/react";
import {
    Camera,
    ArrowRight,
    Globe,
    FileText,
    User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function CreateProfilePage() {

    const navigate = useNavigate();

    const [profile, setProfile] = useState({
        username: "",
        bio: "",
        country: ""
    });

    return (

        <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 flex justify-center items-center px-6 py-10">

            <motion.div
                initial={{opacity:0,y:20}}
                animate={{opacity:1,y:0}}
                className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8"
            >

                <h1 className="text-4xl font-black text-slate-900">
                    Ton profil
                </h1>

                <p className="text-slate-500 mt-2">
                    Personnalise ton compte.
                </p>

                {/* Avatar */}

                <div className="flex justify-center mt-8">

                    <button className="relative">

                        <div className="w-32 h-32 rounded-full bg-sky-100 flex items-center justify-center">

                            <User size={55} className="text-sky-500"/>

                        </div>

                        <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg">

                            <Camera size={18}/>

                        </div>

                    </button>

                </div>

                <div className="space-y-5 mt-8">

                    <Input
                        icon={<User size={20}/>}
                        placeholder="Nom d'utilisateur"
                        value={profile.username}
                        onChange={(e)=>setProfile({...profile,username:e.target.value})}
                    />

                    <Input
                        icon={<FileText size={20}/>}
                        placeholder="Petite bio"
                        value={profile.bio}
                        onChange={(e)=>setProfile({...profile,bio:e.target.value})}
                    />

                    <Input
                        icon={<Globe size={20}/>}
                        placeholder="Pays"
                        value={profile.country}
                        onChange={(e)=>setProfile({...profile,country:e.target.value})}
                    />

                </div>

                <button
                    onClick={()=>navigate("/notifications")}
                    className="mt-8 h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 transition text-white font-bold w-full flex items-center justify-center gap-2"
                >

                    Continuer

                    <ArrowRight size={20}/>

                </button>

            </motion.div>

        </main>

    );

}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    icon: React.ReactNode;
};

function Input({icon,...props}:InputProps){

    return(

        <div className="flex items-center gap-3 h-14 rounded-2xl border border-slate-200 px-4 focus-within:border-sky-500 transition">

            <div className="text-slate-400">
                {icon}
            </div>

            <input
                {...props}
                className="flex-1 outline-none bg-transparent"
            />

        </div>

    );

}