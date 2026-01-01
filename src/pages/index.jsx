import Layout from "./Layout.jsx";

// App pages
import Dashboard from "./Dashboard";
import Tests from "./Tests";
import TestEditor from "./TestEditor";
import Modules from "./Modules";
import ModuleEditor from "./ModuleEditor";
import TestResults from "./TestResults";
import TestHistory from "./TestHistory";
import Reports from "./Reports";
import RunResults from "./RunResults";
import Login from "./Login";
import Clients from "./admin/Clients.jsx";
import ClientDetails from "./admin/ClientDetails.jsx";
import Team from "./admin/Team.jsx";
import Billing from "./admin/Billing.jsx";
import Projects from "./admin/Projects.jsx";
import AdminApps from "./admin/AdminApps.jsx";
import AdminAppDetails from "./admin/AdminAppDetails.jsx";
import AdminAppScreens from "./admin/AdminAppScreens.jsx";
import AdminScreenEditor from "./admin/AdminScreenEditor.jsx";

// Landing pages
import Home from "./Home";
import Documentation from "./Documentation";
import Blog from "./Blog";
import CaseStudies from "./CaseStudies";
import Pricing from "./Pricing";
import BookDemo from "./BookDemo";
import StartTrial from "./StartTrial";
import FAQ from "./FAQ";
import AITestGeneration from "./AITestGeneration";
import NaturalLanguageTests from "./NaturalLanguageTests";
import NoVendorLockIn from "./NoVendorLockIn";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

const PAGES = {
    // App pages
    Dashboard: Dashboard,
    Tests: Tests,
    TestEditor: TestEditor,
    Modules: Modules,
    ModuleEditor: ModuleEditor,
    TestResults: TestResults,
    TestHistory: TestHistory,
    Reports: Reports,
    RunResults: RunResults,
    Login: Login,
    AdminClients: Clients,
    AdminClientDetails: ClientDetails,
    AdminApps: AdminApps,
    AdminAppDetails: AdminAppDetails,
    AdminAppScreens: AdminAppScreens,
    AdminScreenEditor: AdminScreenEditor,
    AdminTeam: Team,
    AdminBilling: Billing,
    AdminProjects: Projects,
    // Landing pages
    Home: Home,
    Documentation: Documentation,
    Blog: Blog,
    CaseStudies: CaseStudies,
    Pricing: Pricing,
    BookDemo: BookDemo,
    StartTrial: StartTrial,
    FAQ: FAQ,
    AITestGeneration: AITestGeneration,
    NaturalLanguageTests: NaturalLanguageTests,
    NoVendorLockIn: NoVendorLockIn,
}

function _getCurrentPage(url) {
    // Handle root route
    if (url === '/' || url === '') {
        return 'Home';
    }
    
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || 'Home';
}

// Create a wrapper component that uses useLocation inside the Router context
import { Auth } from '@/api/auth.js';


function RequireAuth({ children, requiredRole, allowedRoles }) {
    const location = useLocation();
    
    // Check token expiry on every route change
    Auth.checkTokenExpiry();
    
    const isAuthed = Auth.isAuthenticated();
    const userRole = Auth.getRole();
    
    if (!isAuthed) {
        // Save attempted path for post-login redirect
        if (typeof window !== 'undefined') {
            localStorage.setItem('postLoginRedirect', location.pathname);
        }
        return <Navigate to="/Login" replace />;
    }
    
    // Check if user has required role (single role check)
    if (requiredRole && userRole !== requiredRole) {
        return <Navigate to="/Dashboard" replace />;
    }
    
    // Check if user has one of the allowed roles (multiple roles check)
    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/Dashboard" replace />;
    }
    
    return children;
}

function RedirectIfAuthenticated({ children }) {
    if (Auth.isAuthenticated()) {
        return <Navigate to="/Dashboard" replace />;
    }
    return children;
}

function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                {/* Root route - show landing page */}
                <Route path="/" element={<Home />} />
                
                {/* Landing pages - no auth required */}
                <Route path="/Home" element={<Home />} />
                <Route path="/Documentation" element={<Documentation />} />
                <Route path="/Blog" element={<Blog />} />
                <Route path="/CaseStudies" element={<CaseStudies />} />
                <Route path="/Pricing" element={<Pricing />} />
                <Route path="/BookDemo" element={<BookDemo />} />
                <Route path="/StartTrial" element={<StartTrial />} />
                <Route path="/FAQ" element={<FAQ />} />
                <Route path="/AITestGeneration" element={<AITestGeneration />} />
                <Route path="/NaturalLanguageTests" element={<NaturalLanguageTests />} />
                <Route path="/NoVendorLockIn" element={<NoVendorLockIn />} />
                
                {/* App pages - require auth */}
                <Route path="/Login" element={<RedirectIfAuthenticated><Login /></RedirectIfAuthenticated>} />
                <Route path="/Dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/Tests" element={<RequireAuth><Tests /></RequireAuth>} />
                <Route path="/TestEditor" element={<RequireAuth><TestEditor /></RequireAuth>} />
                <Route path="/Modules" element={<RequireAuth><Modules /></RequireAuth>} />
                <Route path="/ModuleEditor" element={<RequireAuth><ModuleEditor /></RequireAuth>} />
                <Route path="/TestResults" element={<RequireAuth><TestResults /></RequireAuth>} />
                <Route path="/TestHistory" element={<RequireAuth><TestHistory /></RequireAuth>} />
                <Route path="/Reports" element={<RequireAuth><Reports /></RequireAuth>} />
                <Route path="/RunResults" element={<RequireAuth><RunResults /></RequireAuth>} />
                <Route path="/AdminClients" element={<RequireAuth allowedRoles={["SUPER_ADMIN", "VENDOR_ADMIN"]}><Clients /></RequireAuth>} />
                <Route path="/AdminClientDetails" element={<RequireAuth allowedRoles={["SUPER_ADMIN", "VENDOR_ADMIN"]}><ClientDetails /></RequireAuth>} />
                <Route path="/AdminApps" element={<RequireAuth requiredRole="SUPER_ADMIN"><AdminApps /></RequireAuth>} />
                <Route path="/AdminAppDetails" element={<RequireAuth requiredRole="SUPER_ADMIN"><AdminAppDetails /></RequireAuth>} />
                <Route path="/AdminAppScreens" element={<RequireAuth requiredRole="SUPER_ADMIN"><AdminAppScreens /></RequireAuth>} />
                <Route path="/AdminScreenEditor" element={<RequireAuth requiredRole="SUPER_ADMIN"><AdminScreenEditor /></RequireAuth>} />
                <Route path="/AdminTeam" element={<RequireAuth requiredRole="CLIENT_ADMIN"><Team /></RequireAuth>} />
                <Route path="/AdminBilling" element={<RequireAuth requiredRole="CLIENT_ADMIN"><Billing /></RequireAuth>} />
                <Route path="/AdminProjects" element={<RequireAuth allowedRoles={["CLIENT_ADMIN", "SUPER_ADMIN"]}><Projects /></RequireAuth>} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}