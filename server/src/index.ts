
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createTemplateInputSchema,
  createPackageInputSchema,
  createInvitationInputSchema,
  updateInvitationInputSchema,
  createRSVPInputSchema,
  createGuestBookInputSchema,
  createDigitalGiftInputSchema,
  createWalletTopupInputSchema,
  processWalletTopupInputSchema,
  createQRCheckinInputSchema
} from './schema';

// Import handlers
import { registerUser, loginUser, getCurrentUser } from './handlers/auth';
import { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate } from './handlers/templates';
import { getPackages, getPackageById, createPackage, updatePackage, deletePackage } from './handlers/packages';
import {
  getInvitations,
  getInvitationById,
  getInvitationBySlug,
  createInvitation,
  updateInvitation,
  publishInvitation,
  deleteInvitation
} from './handlers/invitations';
import { getRSVPsByInvitation, createRSVP, updateRSVP, deleteRSVP } from './handlers/rsvp';
import { getGuestBookByInvitation, createGuestBookEntry, deleteGuestBookEntry } from './handlers/guest_book';
import { getDigitalGiftsByInvitation, createDigitalGift, confirmDigitalGift, deleteDigitalGift } from './handlers/digital_gifts';
import { getWalletTopups, createWalletTopup, processWalletTopup, getWalletBalance } from './handlers/wallet';
import { getQRCheckinsByInvitation, createQRCheckin, generateQRCode } from './handlers/qr_checkin';
import { getStatistics, getUserStatistics } from './handlers/statistics';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  getCurrentUser: publicProcedure
    .query(() => getCurrentUser(1)), // TODO: Get from auth context

  // Template routes
  getTemplates: publicProcedure
    .query(() => getTemplates()),

  getTemplateById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTemplateById(input)),

  createTemplate: publicProcedure
    .input(createTemplateInputSchema)
    .mutation(({ input }) => createTemplate(input)),

  updateTemplate: publicProcedure
    .input(z.object({ id: z.number() }).merge(createTemplateInputSchema.partial()))
    .mutation(({ input: { id, ...data } }) => updateTemplate(id, data)),

  deleteTemplate: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteTemplate(input)),

  // Package routes
  getPackages: publicProcedure
    .query(() => getPackages()),

  getPackageById: publicProcedure
    .input(z.number())
    .query(({ input }) => getPackageById(input)),

  createPackage: publicProcedure
    .input(createPackageInputSchema)
    .mutation(({ input }) => createPackage(input)),

  updatePackage: publicProcedure
    .input(z.object({ id: z.number() }).merge(createPackageInputSchema.partial()))
    .mutation(({ input: { id, ...data } }) => updatePackage(id, data)),

  deletePackage: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deletePackage(input)),

  // Invitation routes
  getInvitations: publicProcedure
    .query(() => getInvitations(1)), // TODO: Get from auth context

  getInvitationById: publicProcedure
    .input(z.number())
    .query(({ input }) => getInvitationById(input)),

  getInvitationBySlug: publicProcedure
    .input(z.string())
    .query(({ input }) => getInvitationBySlug(input)),

  createInvitation: publicProcedure
    .input(createInvitationInputSchema)
    .mutation(({ input }) => createInvitation(1, input)), // TODO: Get userId from auth context

  updateInvitation: publicProcedure
    .input(updateInvitationInputSchema)
    .mutation(({ input }) => updateInvitation(1, input)), // TODO: Get userId from auth context

  publishInvitation: publicProcedure
    .input(z.number())
    .mutation(({ input }) => publishInvitation(1, input)), // TODO: Get userId from auth context

  deleteInvitation: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteInvitation(1, input)), // TODO: Get userId from auth context

  // RSVP routes
  getRSVPsByInvitation: publicProcedure
    .input(z.number())
    .query(({ input }) => getRSVPsByInvitation(input)),

  createRSVP: publicProcedure
    .input(createRSVPInputSchema)
    .mutation(({ input }) => createRSVP(input)),

  updateRSVP: publicProcedure
    .input(z.object({ id: z.number() }).merge(createRSVPInputSchema.partial()))
    .mutation(({ input: { id, ...data } }) => updateRSVP(id, data)),

  deleteRSVP: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteRSVP(input)),

  // Guest Book routes
  getGuestBookByInvitation: publicProcedure
    .input(z.number())
    .query(({ input }) => getGuestBookByInvitation(input)),

  createGuestBookEntry: publicProcedure
    .input(createGuestBookInputSchema)
    .mutation(({ input }) => createGuestBookEntry(input)),

  deleteGuestBookEntry: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteGuestBookEntry(input)),

  // Digital Gift routes
  getDigitalGiftsByInvitation: publicProcedure
    .input(z.number())
    .query(({ input }) => getDigitalGiftsByInvitation(input)),

  createDigitalGift: publicProcedure
    .input(createDigitalGiftInputSchema)
    .mutation(({ input }) => createDigitalGift(input)),

  confirmDigitalGift: publicProcedure
    .input(z.number())
    .mutation(({ input }) => confirmDigitalGift(input)),

  deleteDigitalGift: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteDigitalGift(input)),

  // Wallet routes
  getWalletTopups: publicProcedure
    .query(() => getWalletTopups(1)), // TODO: Get from auth context

  createWalletTopup: publicProcedure
    .input(createWalletTopupInputSchema)
    .mutation(({ input }) => createWalletTopup(1, input)), // TODO: Get userId from auth context

  processWalletTopup: publicProcedure
    .input(processWalletTopupInputSchema)
    .mutation(({ input }) => processWalletTopup(1, input)), // TODO: Get adminId from auth context

  getWalletBalance: publicProcedure
    .query(() => getWalletBalance(1)), // TODO: Get userId from auth context

  // QR Check-in routes
  getQRCheckinsByInvitation: publicProcedure
    .input(z.number())
    .query(({ input }) => getQRCheckinsByInvitation(input)),

  createQRCheckin: publicProcedure
    .input(createQRCheckinInputSchema)
    .mutation(({ input }) => createQRCheckin(input)),

  generateQRCode: publicProcedure
    .input(z.object({ invitationId: z.number(), guestName: z.string() }))
    .mutation(({ input }) => generateQRCode(input.invitationId, input.guestName)),

  // Statistics routes
  getStatistics: publicProcedure
    .query(() => getStatistics()),

  getUserStatistics: publicProcedure
    .query(() => getUserStatistics(1)), // TODO: Get userId from auth context
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
