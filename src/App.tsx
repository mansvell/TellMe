import { Routes, Route } from "react-router-dom";

import SplashPage from "./pages/SplashPage.tsx";
import WelcomePage from "./pages/WelcomePage";


export default function App() {

  return (

      <Routes>

        <Route path="/" element={<SplashPage />} />

        <Route path="/welcome" element={<WelcomePage />} />

      </Routes>

  );

}