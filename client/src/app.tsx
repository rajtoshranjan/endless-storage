import { Provider } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import './assets/styles.css';
import { Layout } from './components';
import { AuthGuard, GuestGuard } from './components/guards';
import { TooltipProvider } from './components/ui';
import { CustomRouter } from './lib/custom-router';
import { history } from './lib/utils';
import {
  AuthLayout,
  FileManagementPage,
  LoginPage,
  SignUpPage,
  UsersPage,
  FileShareLinkDownload,
} from './pages';
import {
  SettingsLayout,
  AppearanceSection,
  StorageSection,
  OAuthCallbackPage,
} from './pages/settings';
import { store } from './store';

function App() {
  return (
    <Provider store={store}>
      <TooltipProvider>
        <CustomRouter history={history}>
          <Routes>
            {/* Guest routes */}
            <Route element={<GuestGuard />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
              </Route>
            </Route>

            {/* Protected routes */}
            <Route element={<AuthGuard />}>
              <Route element={<Layout />}>
                <Route index element={<FileManagementPage />} />
                <Route
                  path="shared-with-me"
                  element={<FileManagementPage fileType="shared" />}
                />
                <Route path="users" element={<UsersPage />} />

                {/* Settings with nested routes */}
                <Route path="settings" element={<SettingsLayout />}>
                  <Route index element={<AppearanceSection />} />
                  <Route path="storage" element={<StorageSection />} />
                </Route>
              </Route>
            </Route>

            {/* OAuth callback route */}
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

            {/* Unprotected route */}
            <Route path="/files/:slug" element={<FileShareLinkDownload />} />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CustomRouter>
      </TooltipProvider>
    </Provider>
  );
}

export default App;
