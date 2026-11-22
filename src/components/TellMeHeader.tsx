import logo from "../assets/icon.png";

export default function TellMeHeader() {
    return (
        <header className="shrink-0">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-5">
                <img src={logo} alt="" className="h-12 w-12 object-contain" />
                <h1 className="text-xl font-bold">TellMe</h1>
            </div>
        </header>
    );
}
