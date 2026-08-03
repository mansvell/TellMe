import { Routes, Route } from "react-router-dom";

import SplashPage from "./pages/SplashPage.tsx";
import WelcomePage from "./pages/WelcomePage";
import RegisterPage from "./pages/RegisterPage.tsx";
import NotificationPage from "./pages/NotificationPage.tsx";


export default function App() {

  return (

      <Routes>

        <Route path="/" element={<SplashPage />} />

        <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/notif" element={<NotificationPage />} />

      </Routes>

  );

}