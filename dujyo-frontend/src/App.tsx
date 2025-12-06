import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';

import { BlockchainProvider } from './contexts/BlockchainContext';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import { PlayerProvider, usePlayerContext } from './contexts/PlayerContext';
import { EventBusProvider } from './contexts/EventBusContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

import { WalletDashboard } from './components/wallet/WalletDashboard';
import { ArtistPortal } from './components/artist/ArtistPortal';
import { ContentMarketplace } from './components/marketplace/ContentMarketplace';
import { WalletConnector } from './components/wallet/WalletConnector';
import SimpleAppLayout from './components/Layout/SimpleAppLayout';
import GlobalPlayer from './components/Player/GlobalPlayer';

// Artist Layout and Components
import ArtistLayout from './layouts/ArtistLayout';
import ArtistDashboard from './components/artist/ArtistDashboard';
import RoyaltiesManager from './components/artist/RoyaltiesManager';
import PaymentDashboard from './components/payments/PaymentDashboard';
import UploadMusic from './components/artist/UploadMusic';
import VideoManager from './components/artist/VideoManager';
import GamingManager from './components/artist/GamingManager';
import CrossPlatformAnalytics from './components/artist/CrossPlatformAnalytics';
import ContentManager from './components/artist/ContentManager';
import FanEngagement from './components/artist/FanEngagement';

// New Analytics & Royalties Components
import RealTimeAnalyticsDashboard from './components/analytics/RealTimeAnalyticsDashboard';
import RoyaltiesOverview from './components/royalties/RoyaltiesOverview';
import ExternalReportForm from './components/royalties/ExternalReportForm';
import DiscoveryLeaderboard from './components/discovery/DiscoveryLeaderboard';
import UserDiscoveryStats from './components/discovery/UserDiscoveryStats';

import ExploreNow from './pages/ExploreNow/ExploreNow';
import ExploreVideo from './components/Video/ExploreVideos';
import ExploreGaming from './components/Gaming/ExploreGaming';
import ExploreEducation from './components/Education/ExploreEducation';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import SignupPage from './pages/SignupPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/HomePage/ProfilePage/ProfilePage';
import BecomeArtist from './components/onboarding/BecomeArtist';
import HelpCenter from './components/onboarding/HelpCenter';
import FeedbackWidget from './components/onboarding/FeedbackWidget';
import { OnboardingTour, artistDashboardTour } from './components/onboarding/OnboardingTour';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import ErrorBoundary from './components/ErrorBoundary';
import MusicPage from './pages/HomePage/ProfilePage/MusicPage';
import VideoPage from './pages/VideoPage';
import GamingPage from './pages/GamingPage';
import SearchPage from './pages/SearchPage';

import BlockchainInfo from './components/blockchain/BlockchainInfo';
import TransactionForm from './components/blockchain/TransactionForm';
import BlockchainView from './components/blockchain/BlockchainView';
import ValidatorForm from './components/blockchain/ValidatorForm';

import DEXPage from './pages/DEXPage';
import ConsensusPage from './pages/ConsensusPage';
import AdminPage from './pages/AdminPage';
import StakingPage from './pages/StakingPage';
import UploadPage from './pages/UploadPage';
import ValidatorPage from './pages/ValidatorPage';
import ValidatorRewardsPage from './pages/ValidatorRewardsPage';
import ValidatorStatsPage from './pages/ValidatorStatsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminContentPage from './pages/AdminContentPage';
import AdminBlockchainPage from './pages/AdminBlockchainPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import MerchComingSoon from './pages/MerchComingSoon';
import S2EHistoryPage from './pages/S2EHistoryPage';
import TipLeaderboardPage from './pages/TipLeaderboardPage';

import GlobalStyle from './styles/GlobalStyle';
import './styles/dujyo-components.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <GlobalStyle />
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <EventBusProvider>
            <BlockchainProvider>
              <WebSocketProvider>
                <PlayerProvider>
                  <LanguageProvider>
                    <ThemeProvider>
                      <AppRoutes />
                    </ThemeProvider>
                  </LanguageProvider>
                </PlayerProvider>
              </WebSocketProvider>
            </BlockchainProvider>
          </EventBusProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

const AppRoutes: React.FC = () => {
  const { loading, error, isConnected } = useWebSocket();
  const { currentTrack, playerPosition } = usePlayerContext();
  const [showHelpCenter, setShowHelpCenter] = React.useState(false);
  const [showTour, setShowTour] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Expose help center toggle globally
  React.useEffect(() => {
    (window as any).openHelpCenter = () => setShowHelpCenter(true);
    (window as any).startTour = () => setShowTour(true);
  }, []);

  // Listen for beta access required event - redirect to onboarding
  React.useEffect(() => {
    const handleBetaAccessRequired = () => {
      const returnTo = encodeURIComponent(location.pathname);
      navigate(`/onboarding?step=beta&returnTo=${returnTo}`);
    };
    window.addEventListener('dujyo:beta-access-required', handleBetaAccessRequired);
    return () => window.removeEventListener('dujyo:beta-access-required', handleBetaAccessRequired);
  }, [navigate, location.pathname]);

  // Only show loading/error for protected routes, not for login page
  const currentPath = window.location.pathname;
  const isPublicRoute = ['/login', '/signin', '/'].includes(currentPath);
  
  if (!isPublicRoute && loading) return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>;
  
  // Show non-blocking notification if WebSocket fails
  const showWebSocketWarning = !isPublicRoute && error && !isConnected;

  return (
    <>
      {/* WebSocket Warning Banner (non-blocking) */}
      {showWebSocketWarning && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-500/90 text-black px-4 py-2 text-sm text-center">
          <span>⚠️ Real-time updates unavailable. The app will continue to work normally.</span>
        </div>
      )}

      {/* Global Feedback Widget */}
      <FeedbackWidget position="bottom-right" />

      {/* Help Center */}
      {showHelpCenter && <HelpCenter onClose={() => setShowHelpCenter(false)} />}

      {/* Onboarding Tour for Artist Dashboard */}
      {showTour && currentPath === '/artist/dashboard' && (
        <OnboardingTour
          tourId="artist-dashboard"
          steps={artistDashboardTour}
          onComplete={() => {
            setShowTour(false);
            localStorage.setItem('tour_artist-dashboard_completed', 'true');
          }}
          onSkip={() => setShowTour(false)}
          autoStart={true}
        />
      )}

    <Routes>
        <Route path="/" element={<ExploreNow />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signin" element={<Login />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="/explore" element={<ExploreNow />} />
        <Route path="/explore/video" element={<ExploreVideo />} />
        <Route path="/explore/gaming" element={<ExploreGaming />} />
        <Route path="/explore/education" element={<ExploreEducation />} />
        <Route path="/music" element={<MusicPage />} />
        <Route path="/video" element={
          <ErrorBoundary>
            <VideoPage />
          </ErrorBoundary>
        } />
        <Route path="/gaming" element={<GamingPage />} />
        <Route path="/search" element={<SearchPage />} />

        {/* Rutas protegidas */}
        <Route path="/profile" element={<ProtectedRoute><SimpleAppLayout><ProfilePage /></SimpleAppLayout></ProtectedRoute>} />
        <Route path="/become-artist" element={<ProtectedRoute><BecomeArtist /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletDashboard /></ProtectedRoute>} />
        <Route path="/artist-portal" element={<ProtectedRoute><ArtistPortal /></ProtectedRoute>} />
        <Route path="/wallet-connector" element={<ProtectedRoute><WalletConnector /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><ContentMarketplace /></ProtectedRoute>} />
        <Route path="/dex" element={<ProtectedRoute><DEXPage /></ProtectedRoute>} />
        <Route path="/staking" element={<ProtectedRoute><StakingPage /></ProtectedRoute>} />
        <Route path="/merch" element={<ProtectedRoute><MerchComingSoon /></ProtectedRoute>} />
        <Route path="/upload" element={
          <ProtectedRoute>
            <ArtistLayout>
              <UploadMusic />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        <Route path="/consensus" element={<ProtectedRoute><ConsensusPage /></ProtectedRoute>} />
        <Route path="/validator" element={<ProtectedRoute><ValidatorPage /></ProtectedRoute>} />
        <Route path="/validator/rewards" element={<ProtectedRoute><ValidatorRewardsPage /></ProtectedRoute>} />
        <Route path="/validator/stats" element={<ProtectedRoute><ValidatorStatsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/content" element={<ProtectedRoute><AdminContentPage /></ProtectedRoute>} />
        <Route path="/admin/blockchain" element={<ProtectedRoute><AdminBlockchainPage /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalyticsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SimpleAppLayout><SettingsPage /></SimpleAppLayout></ProtectedRoute>} />
        <Route path="/s2e/history" element={<ProtectedRoute><S2EHistoryPage /></ProtectedRoute>} />
        <Route path="/tips/leaderboard" element={<ProtectedRoute><SimpleAppLayout><TipLeaderboardPage /></SimpleAppLayout></ProtectedRoute>} />
        <Route path="/blockchain-info" element={<ProtectedRoute><BlockchainInfo /></ProtectedRoute>} />
        <Route path="/add-transaction" element={<ProtectedRoute><TransactionForm /></ProtectedRoute>} />
        <Route path="/view-blockchain" element={<ProtectedRoute><BlockchainView /></ProtectedRoute>} />
        <Route path="/add-validator" element={<ProtectedRoute><ValidatorForm /></ProtectedRoute>} />

        {/* Artist Routes with ArtistLayout */}
        <Route path="/artist/dashboard" element={
          <ProtectedRoute>
            <ArtistLayout>
              <ArtistDashboard />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        <Route path="/artist/royalties" element={
          <ProtectedRoute>
            <ArtistLayout>
              <RoyaltiesManager />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/artist/analytics" element={
          <ProtectedRoute>
            <ArtistLayout>
              <CrossPlatformAnalytics />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        <Route path="/artist/content" element={
          <ProtectedRoute>
            <ArtistLayout>
              <ContentManager />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        <Route path="/artist/fans" element={
          <ProtectedRoute>
            <ArtistLayout>
              <FanEngagement />
            </ArtistLayout>
          </ProtectedRoute>
        } />

        {/* New Analytics Routes */}
        <Route path="/analytics/realtime" element={
          <ProtectedRoute>
            <ArtistLayout>
              <RealTimeAnalyticsDashboard />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        
        {/* New Royalties Routes */}
        <Route path="/royalties/overview" element={
          <ProtectedRoute>
            <ArtistLayout>
              <RoyaltiesOverview />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        <Route path="/royalties/external-report" element={
          <ProtectedRoute>
            <ArtistLayout>
              <ExternalReportForm artistId="default" />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        
        {/* Payment Dashboard Route */}
        <Route path="/payments" element={
          <ProtectedRoute>
            <ArtistLayout>
              <PaymentDashboard />
            </ArtistLayout>
          </ProtectedRoute>
        } />

        {/* New Discovery Gamification Routes */}
        <Route path="/discovery/leaderboard" element={
          <ProtectedRoute>
            <ArtistLayout>
              <DiscoveryLeaderboard />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        <Route path="/discovery/stats/:userId" element={
          <ProtectedRoute>
            <ArtistLayout>
              <UserDiscoveryStats userId="default_user" />
            </ArtistLayout>
          </ProtectedRoute>
        } />
        {/* 404 - Catch all unmatched routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global Player - Persists across all page navigations */}
      {currentTrack && (
        <GlobalPlayer 
          track={currentTrack}
          position={playerPosition}
        />
      )}
    </>
  );
};

export default App;
