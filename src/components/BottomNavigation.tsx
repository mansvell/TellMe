import {
    House,
    MailPlus,
    Settings,
} from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
    active: "home" | "invitations" | "settings";
};

export default function BottomNavigation({ active }: Props) {

    return (

        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/30 bg-white/90 backdrop-blur-xl">

            <div className="mx-auto flex h-20 max-w-5xl items-center justify-around">

                <Item
                    to="/home"
                    active={active === "home"}
                    icon={<House size={22}/>}
                    title="Accueil"
                />

                <Item
                    to="/invit"
                    active={active === "invitations"}
                    icon={<MailPlus size={22}/>}
                    title="Invitations"
                />

                <Item
                    to="/settings"
                    active={active === "settings"}
                    icon={<Settings size={22}/>}
                    title="Paramètres"
                />

            </div>

        </nav>

    );

}

type ItemProps = {
    to: string;
    icon: React.ReactNode;
    title: string;
    active: boolean;
};

function Item({to, icon, title, active}: ItemProps){

    return(

        <Link
            to={to}
            className={`flex flex-col items-center gap-1 transition ${
                active
                    ? "text-sky-500"
                    : "text-slate-400 hover:text-sky-500"
            }`}
        >

            {icon}

            <span className="text-xs font-semibold">

                {title}

            </span>

        </Link>

    );

}