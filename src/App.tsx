import { Routes, Route } from "react-router-dom";

import SplashPage from "./pages/SplashPage.tsx";


export default function App() {

  return (

      <Routes>

        <Route path="/" element={<SplashPage />} />

      </Routes>

  );

}