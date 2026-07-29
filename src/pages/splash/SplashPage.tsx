import SplashLoader from "../../components/splash/SplashLoader";
import TellMeLogo from "../../components/common/TellMeLogo";

export default function SplashPage() {
    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">

            <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />

            <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />

            <section className="relative z-10 flex flex-col items-center px-6">
                <TellMeLogo />
                <SplashLoader />
            </section>
        </main>
    );
}