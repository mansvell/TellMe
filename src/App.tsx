import {Routes, Route, Navigate} from "react-router-dom";

import DiscoverPage from "./pages/DiscoverPage";
import FunPage from "./pages/FunPage";
import CreateStorytimePage from "./pages/CreateStorytimePage";
import MyStorytimesPage from "./pages/MyStorytimesPage";
import SecretLandingPage from "./pages/SecretLandingPage";
import AppTabsLayout from "./components/AppTabsLayout";
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
import BuzzPage from "./pages/BuzzPage";
import VoteBuzz from "./pages/VoteBuzz";


export default function App() {

  return (

      <Routes>

          <Route path="/" element={<SplashPage />} />

          <Route path="/welcome" element={<PublicOnlyRoute><WelcomePage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          <Route path="/notif" element={<ProtectedRoute><NotificationPage /></ProtectedRoute>} />

          <Route element={<ProtectedRoute><AppTabsLayout /></ProtectedRoute>}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/invit" element={<InvitationsPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/buzz" element={<BuzzPage />} />
              <Route path="/fun" element={<FunPage />} />
              <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/fun/story/new" element={<ProtectedRoute><CreateStorytimePage /></ProtectedRoute>} />
          <Route path="/fun/stories" element={<ProtectedRoute><MyStorytimesPage /></ProtectedRoute>} />
          <Route path="/chat/:groupId" element={<ProtectedRoute> <ChatPage/> </ProtectedRoute>} />
          <Route path="/gdetailp/:groupId" element={<ProtectedRoute> <GroupDetailsPage /> </ProtectedRoute>} />

          <Route path="/members/:groupId" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/media/:groupId" element={<ProtectedRoute><MediaPage /></ProtectedRoute>} />
          <Route path="/custom/:groupId" element={<ProtectedRoute><CustomizationPage /></ProtectedRoute>} />

          <Route path="/join/preview" element={<JoinPreviewPage/>} />
          <Route path="/join/:inviteCode" element={<JoinPreviewPage />}/>

          <Route path="/privacy" element={<PrivacyPage/>}/>
           <Route path="/terms" element={<TermsPage/>}/>

          <Route path="/b/:shareCode" element={<VoteBuzz />}/>
          <Route path="/s/:token" element={<SecretLandingPage />} />

          <Route path="*" element={<Navigate to="/" replace />}/>

      </Routes>

  );

}
