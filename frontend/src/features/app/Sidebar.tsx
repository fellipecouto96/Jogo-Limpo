import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.ts';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/app', icon: GridIcon, end: true },
  { label: 'Torneios', path: '/app/tournaments', icon: TrophyIcon, end: false },
  { label: 'Criar torneio', path: '/app/new', icon: PlusIcon, end: false },
];

const BOTTOM_ITEMS = [
  { label: 'Configuracoes', path: '/app/settings', icon: GearIcon },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string, end: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = (path: string, end: boolean) =>
    [
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
      isActive(path, end)
        ? 'bg-emerald-500/10 text-emerald-400'
        : 'text-gray-400 hover:text-white hover:bg-white/5',
    ].join(' ');

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-gray-800">
        <Link
          to="/app"
          onClick={onClose}
          className="font-display text-xl text-white tracking-tight"
        >
          Jogo Limpo
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={navLinkClass(item.path, item.end)}
          >
            <item.icon />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={navLinkClass(item.path, false)}
          >
            <item.icon />
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors w-full"
        >
          <ExitIcon />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gray-950 border-r border-gray-800">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-950 border-r border-gray-800 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

/* Minimal SVG icons — 20x20 stroke-based */

function GridIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h8v5a4 4 0 0 1-8 0V3z" />
      <path d="M6 5H4a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3" />
      <path d="M14 5h2a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3" />
      <path d="M10 12v2" />
      <path d="M7 17h6" />
      <path d="M7 14h6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M10 7v6M7 10h6" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5l.7 2.2a5.5 5.5 0 0 1 2.1 1.2l2.2-.5 1 1.7-1.5 1.7a5.5 5.5 0 0 1 0 2.4l1.5 1.7-1 1.7-2.2-.5a5.5 5.5 0 0 1-2.1 1.2L10 17.5l-.7-2.2a5.5 5.5 0 0 1-2.1-1.2l-2.2.5-1-1.7 1.5-1.7a5.5 5.5 0 0 1 0-2.4L4 7.1l1-1.7 2.2.5a5.5 5.5 0 0 1 2.1-1.2L10 2.5z" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3" />
      <path d="M13 14l4-4-4-4" />
      <path d="M17 10H8" />
    </svg>
  );
}
