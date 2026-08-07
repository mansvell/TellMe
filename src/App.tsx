import {Routes, Route, Navigate} from "react-router-dom";

import SplashPage from "./pages/SplashPage.tsx";
import WelcomePage from "./pages/WelcomePage";
import RegisterPage from "./pages/RegisterPage.tsx";
import NotificationPage from "./pages/NotificationPage.tsx";
import ChooseGroupPage from "./pages/ChooseGroupePage.tsx";
import HomePage from "./pages/HomePage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import GroupDetailsPage from "./pages/GroupDetailsPage.tsx";
import MembersPage from "./pages/MembersPage.tsx";
import MediaPage from "./pages/MediaPage.tsx";
import CustomizationPage from "./pages/CustomizationPage.tsx";
import InvitationsPage from "./pages/InvitationsPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import JoinByLinkPage from "./pages/joinByLinkpage.tsx";
import JoinPreviewPage from "./pages/JoinPreviewPage.tsx";


export default function App() {

  return (

      <Routes>

          <Route path="/" element={<SplashPage />} />

            <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/notif" element={<NotificationPage />} />
          <Route path="/choosegp" element={<ChooseGroupPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/chat/:groupId" element={<ChatPage />} />
          <Route path="/gdetailp/:groupId" element={<GroupDetailsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/custom" element={<CustomizationPage />} />
          <Route path="/invit" element={<InvitationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
              path="*"
              element={<Navigate to="/" replace />}
          />
          <Route path="/join" element={<JoinByLinkPage/>} />
          <Route path="/join/preview" element={<JoinPreviewPage/>} />
      </Routes>

  );

}