import {Routes, Route, Navigate} from "react-router-dom";

import SplashPage from "./pages/SplashPage.tsx";
import WelcomePage from "./pages/WelcomePage";
import RegisterPage from "./pages/RegisterPage.tsx";
import NotificationPage from "./pages/NotificationPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import GroupDetailsPage from "./pages/GroupDetailsPage.tsx";
import MembersPage from "./pages/MembersPage.tsx";
import MediaPage from "./pages/MediaPage.tsx";
import CustomizationPage from "./pages/CustomizationPage.tsx";
import InvitationsPage from "./pages/InvitationsPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import JoinPreviewPage from "./pages/JoinPreviewPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";


export default function App() {

  return (

      <Routes>

          <Route path="/" element={<SplashPage />} />

          <Route path="/welcome" element={<PublicOnlyRoute><WelcomePage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          <Route path="/notif" element={<PublicOnlyRoute> <NotificationPage/> </PublicOnlyRoute>} />

          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/chat/:groupId" element={<ProtectedRoute> <ChatPage/> </ProtectedRoute>} />
          <Route path="/gdetailp/:groupId" element={<ProtectedRoute> <GroupDetailsPage /> </ProtectedRoute>} />

          <Route path="/members/:groupId" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/media/:groupId" element={<ProtectedRoute><MediaPage /></ProtectedRoute>} />
          <Route path="/custom/:groupId" element={<ProtectedRoute><CustomizationPage /></ProtectedRoute>} />

          <Route path="/invit" element={<ProtectedRoute><InvitationsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute> <SettingsPage/> </ProtectedRoute>} />

          <Route path="/join/preview" element={<JoinPreviewPage/>} />
          <Route path="/join/:inviteCode" element={<JoinPreviewPage />}/>

          <Route path="/privacy" element={<PrivacyPage/>}/>
           <Route path="/terms" element={<TermsPage/>}/>

          <Route path="*" element={<Navigate to="/" replace />}/>

      </Routes>

  );

}