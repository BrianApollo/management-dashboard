import { Routes, Route, Navigate } from "react-router-dom";
import { OpsLayout } from "../components/global/OpsLayout";
import LoginPage from "../pages/auth/LoginPage";
import { RequireAuth, RedirectIfAuthenticated, RootRedirect } from "../contexts/auth/AuthGuard";

// Overview
import { OverviewPage } from "../pages/overview/OverviewPage";

// Fulfillment
import { FulfillmentPage } from "../pages/fulfillment/FulfillmentPage";
import { FulfillmentOverviewPage } from "../pages/fulfillment/overview/FulfillmentOverviewPage";
import { FulfillmentEcommXPage } from "../pages/fulfillment/ecommx/FulfillmentEcommXPage";
import { FulfillmentEcommOpsPage } from "../pages/fulfillment/ecommops/FulfillmentEcommOpsPage";

// Customer Service
import { CustomerServicePage } from "../pages/customer-service/CustomerServicePage";
import { CustomerServiceOverviewPage } from "../pages/customer-service/overview/CustomerServiceOverviewPage";
import { CustomerServiceTicketsPage } from "../pages/customer-service/tickets/CustomerServiceTicketsPage";

// MIDs / Payments
import { MidsPage } from "../pages/mids/MidsPage";
import { MidsOverviewPage } from "../pages/mids/overview/MidsOverviewPage";
import { MidsChargebacksPage } from "../pages/mids/chargebacks/MidsChargebacksPage";
import { MidsReservesPage } from "../pages/mids/reserves/MidsReservesPage";

// Funnels
import { FunnelsPage } from "../pages/funnels/FunnelsPage";
import { FunnelsOverviewPage } from "../pages/funnels/overview/FunnelsOverviewPage";
import { FunnelsUptimePage } from "../pages/funnels/uptime/FunnelsUptimePage";

// Invoices
import { InvoicesPage } from "../pages/invoices/InvoicesPage";
import { InvoicesOverviewPage } from "../pages/invoices/overview/InvoicesOverviewPage";
import { InvoicesAccuracyPage } from "../pages/invoices/accuracy/InvoicesAccuracyPage";
import { InvoicesStatusPage } from "../pages/invoices/status/InvoicesStatusPage";
import { InvoicesEcommXPage } from "../pages/invoices/ecommx/InvoicesEcommXPage";

// Cashflow
import { CashflowPage } from "../pages/cashflow/CashflowPage";
import { CashflowOverviewPage } from "../pages/cashflow/overview/CashflowOverviewPage";
import { CashflowBalancesPage } from "../pages/cashflow/balances/CashflowBalancesPage";
import { CashflowProjectionsPage } from "../pages/cashflow/projections/CashflowProjectionsPage";

// P&L
import { PnlPage } from "../pages/pnl/PnlPage";
import { PnlOverviewPage } from "../pages/pnl/overview/PnlOverviewPage";
import { PnlDailyPage } from "../pages/pnl/daily/PnlDailyPage";
import { PnlMonthlyPage } from "../pages/pnl/monthly/PnlMonthlyPage";

// Rebills
import { RebillsPage } from "../pages/rebills/RebillsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<OpsLayout />}>
          {/* Overview — flat command center */}
          <Route path="/ops/overview" element={<OverviewPage />} />

          {/* Fulfillment */}
          <Route path="/ops/fulfillment" element={<FulfillmentPage />}>
            <Route index element={<FulfillmentOverviewPage />} />
            <Route path="ecommx" element={<FulfillmentEcommXPage />} />
            <Route path="ecommops" element={<FulfillmentEcommOpsPage />} />
          </Route>

          {/* Customer Service */}
          <Route path="/ops/customer-service" element={<CustomerServicePage />}>
            <Route index element={<CustomerServiceOverviewPage />} />
            <Route path="tickets" element={<CustomerServiceTicketsPage />} />
          </Route>

          {/* MIDs / Payments */}
          <Route path="/ops/mids" element={<MidsPage />}>
            <Route index element={<MidsOverviewPage />} />
            <Route path="chargebacks" element={<MidsChargebacksPage />} />
            <Route path="reserves" element={<MidsReservesPage />} />
          </Route>

          {/* Funnels */}
          <Route path="/ops/funnels" element={<FunnelsPage />}>
            <Route index element={<FunnelsOverviewPage />} />
            <Route path="uptime" element={<FunnelsUptimePage />} />
          </Route>

          {/* Invoices */}
          <Route path="/ops/invoices" element={<InvoicesPage />}>
            <Route index element={<InvoicesOverviewPage />} />
            <Route path="ecommx" element={<InvoicesEcommXPage />} />
            <Route path="accuracy" element={<InvoicesAccuracyPage />} />
            <Route path="status" element={<InvoicesStatusPage />} />
          </Route>

          {/* Cashflow & Balances */}
          <Route path="/ops/cashflow" element={<CashflowPage />}>
            <Route index element={<CashflowOverviewPage />} />
            <Route path="balances" element={<CashflowBalancesPage />} />
            <Route path="projections" element={<CashflowProjectionsPage />} />
          </Route>

          {/* P&L */}
          <Route path="/ops/pnl" element={<PnlPage />}>
            <Route index element={<PnlOverviewPage />} />
            <Route path="daily" element={<PnlDailyPage />} />
            <Route path="monthly" element={<PnlMonthlyPage />} />
          </Route>

          {/* Rebills */}
          <Route path="/ops/rebills" element={<RebillsPage />} />

          {/* Default redirect */}
          <Route path="/ops" element={<Navigate to="/ops/overview" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
