// Modal definitions using the unified builder
// NOTE: This file does NOT have "use server" - the server actions are imported

import { modal } from "@jlnstack/modal";
import {
  renderDashboard,
  renderInvoice,
  renderUserProfile,
} from "./actions.server";

/**
 * User Profile Modal - demonstrates basic server modal
 */
export const userProfileModal = modal
  .input<{ userId: string }>()
  .server(renderUserProfile);

/**
 * Invoice Modal - demonstrates server data fetching
 */
export const invoiceModal = modal
  .input<{ invoiceId: string }>()
  .server(renderInvoice);

/**
 * Dashboard Modal - demonstrates progressive loading with nested Suspense
 */
export const dashboardModal = modal
  .input<{ userId: string }>()
  .server(renderDashboard);
