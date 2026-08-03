import { Routes, Route } from "react-router-dom";

import SplashPage from "./pages/SplashPage.tsx";
import WelcomePage from "./pages/WelcomePage";
import RegisterPage from "./pages/RegisterPage.tsx";
import NotificationPage from "./pages/NotificationPage.tsx";
import ChooseGroupPage from "./pages/ChooseGroupePage.tsx";
import HomePage from "./pages/HomePage.tsx";

export default function App() {

  return (

      <Routes>

          <Route path="/" element={<SplashPage />} />

            <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/notif" element={<NotificationPage />} />
          <Route path="/choosegp" element={<ChooseGroupPage />} />
          <Route path="/home" element={<HomePage />} />
      </Routes>

  );

}