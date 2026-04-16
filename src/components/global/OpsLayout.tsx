import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  IconButton,
  Divider,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BarChartIcon from '@mui/icons-material/BarChart';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../contexts/auth/AuthContext';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 64;

interface NavChild {
  label: string;
  path: string;
}

interface NavItem {
  label: string;
  icon: React.ReactElement;
  path?: string;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    icon: <DashboardIcon />,
    path: '/ops/overview',
  },
  {
    label: 'Fulfillment',
    icon: <LocalShippingIcon />,
    children: [
      { label: 'Overview', path: '/ops/fulfillment' },
      { label: 'EcommX', path: '/ops/fulfillment/ecommx' },
      { label: 'EcommOps', path: '/ops/fulfillment/ecommops' },
    ],
  },
  {
    label: 'Customer Service',
    icon: <SupportAgentIcon />,
    children: [
      { label: 'Overview', path: '/ops/customer-service' },
      { label: 'Tickets', path: '/ops/customer-service/tickets' },
    ],
  },
  {
    label: 'MIDs / Payments',
    icon: <CreditCardIcon />,
    children: [
      { label: 'Overview', path: '/ops/mids' },
      { label: 'Chargebacks', path: '/ops/mids/chargebacks' },
      { label: 'Reserves', path: '/ops/mids/reserves' },
    ],
  },
  {
    label: 'Funnels',
    icon: <FilterAltIcon />,
    children: [
      { label: 'Overview', path: '/ops/funnels' },
      { label: 'Uptime', path: '/ops/funnels/uptime' },
    ],
  },
  {
    label: 'Invoices',
    icon: <ReceiptLongIcon />,
    children: [
      { label: 'Overview', path: '/ops/invoices' },
      { label: 'EcommX', path: '/ops/invoices/ecommx' },
      { label: 'Accuracy', path: '/ops/invoices/accuracy' },
      { label: 'Status', path: '/ops/invoices/status' },
    ],
  },
  {
    label: 'Cashflow',
    icon: <AccountBalanceIcon />,
    children: [
      { label: 'Overview', path: '/ops/cashflow' },
      { label: 'Balances', path: '/ops/cashflow/balances' },
      { label: 'Projections', path: '/ops/cashflow/projections' },
    ],
  },
  {
    label: 'P&L',
    icon: <BarChartIcon />,
    children: [
      { label: 'Overview', path: '/ops/pnl' },
      { label: 'Daily', path: '/ops/pnl/daily' },
      { label: 'Monthly', path: '/ops/pnl/monthly' },
    ],
  },
  {
    label: 'Rebills',
    icon: <AutorenewIcon />,
    path: '/ops/rebills',
  },
];

export function OpsLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Fulfillment: true });
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const isOpen = prev[label];
      // Close all groups, then toggle the clicked one
      const allClosed: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) {
        allClosed[key] = false;
      }
      return { ...allClosed, [label]: !isOpen };
    });
  };

  const isPathActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const isGroupActive = (item: NavItem) => {
    if (item.path) return isPathActive(item.path);
    return item.children?.some((child) => isPathActive(child.path)) ?? false;
  };

  const desktopWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const renderNavItem = (item: NavItem, isCollapsed: boolean) => {
    const hasChildren = item.children && item.children.length > 0;
    const groupOpen = openGroups[item.label] ?? false;
    const active = isGroupActive(item);

    const parentButton = (
      <ListItemButton
        onClick={() => {
          if (hasChildren) {
            if (isCollapsed) {
              // In collapsed mode, clicking navigates to first child
              navigate(item.children![0].path);
              setMobileOpen(false);
            } else {
              toggleGroup(item.label);
            }
          } else if (item.path) {
            navigate(item.path);
            setMobileOpen(false);
          }
        }}
        selected={!hasChildren && active}
        sx={{
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          px: isCollapsed ? 1 : 2,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: isCollapsed ? 0 : 2,
            justifyContent: 'center',
            color: active ? 'primary.main' : undefined,
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!isCollapsed && (
          <>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: active ? 600 : 400,
              }}
            />
            {hasChildren && (groupOpen ? <ExpandLess /> : <ExpandMore />)}
          </>
        )}
      </ListItemButton>
    );

    return (
      <Box key={item.label}>
        {isCollapsed ? (
          <Tooltip title={item.label} placement="right">
            {parentButton}
          </Tooltip>
        ) : (
          parentButton
        )}
        {hasChildren && !isCollapsed && (
          <Collapse in={groupOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              {item.children!.map((child) => {
                const childActive = location.pathname === child.path;
                return (
                  <ListItemButton
                    key={child.path}
                    selected={childActive}
                    onClick={() => {
                      navigate(child.path);
                      setMobileOpen(false);
                    }}
                    sx={{ pl: 7 }}
                  >
                    <ListItemText
                      primary={child.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: childActive ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  const renderDrawer = (isCollapsed: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ justifyContent: isCollapsed ? 'center' : 'space-between', px: isCollapsed ? 1 : 2 }}>
        {!isCollapsed && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
            Admin Dashboard
          </Typography>
        )}
        <IconButton
          onClick={() => setCollapsed(!collapsed)}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          size="small"
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => renderNavItem(item, isCollapsed))}
      </List>
      <Divider />
      <List>
        {isCollapsed ? (
          <Tooltip title="Logout" placement="right">
            <ListItemButton onClick={handleLogout} sx={{ justifyContent: 'center', px: 1 }}>
              <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center' }}>
                <LogoutIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        ) : (
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile-only top bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { xs: 'block', sm: 'none' },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {renderDrawer(false)}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: desktopWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: desktopWidth,
            overflowX: 'hidden',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
        open
      >
        {renderDrawer(collapsed)}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: { xs: '64px', sm: 0 },
          maxWidth: 1400,
          mx: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
