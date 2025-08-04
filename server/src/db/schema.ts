
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'member']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['hadir', 'tidak_hadir', 'belum_konfirmasi']);
export const statusEnum = pgEnum('status', ['pending', 'approved', 'rejected', 'confirmed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  role: userRoleEnum('role').notNull().default('member'),
  wallet_balance: numeric('wallet_balance', { precision: 10, scale: 2 }).notNull().default('0'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Templates table
export const templatesTable = pgTable('templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  preview_image: text('preview_image'),
  template_data: text('template_data').notNull(), // JSON string
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Packages table
export const packagesTable = pgTable('packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  features: text('features').notNull(), // JSON string
  max_guests: integer('max_guests'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Invitations table
export const invitationsTable = pgTable('invitations', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  template_id: integer('template_id').notNull(),
  package_id: integer('package_id').notNull(),
  title: text('title').notNull(),
  bride_name: text('bride_name').notNull(),
  groom_name: text('groom_name').notNull(),
  wedding_date: timestamp('wedding_date').notNull(),
  ceremony_time: text('ceremony_time'),
  ceremony_location: text('ceremony_location'),
  reception_time: text('reception_time'),
  reception_location: text('reception_location'),
  love_story: text('love_story'),
  background_music_url: text('background_music_url'),
  gallery_photos: text('gallery_photos').notNull().default('[]'), // JSON array
  gallery_videos: text('gallery_videos').notNull().default('[]'), // JSON array
  live_stream_url: text('live_stream_url'),
  rsvp_enabled: boolean('rsvp_enabled').notNull().default(true),
  guest_book_enabled: boolean('guest_book_enabled').notNull().default(true),
  digital_gift_enabled: boolean('digital_gift_enabled').notNull().default(true),
  qr_checkin_enabled: boolean('qr_checkin_enabled').notNull().default(false),
  is_published: boolean('is_published').notNull().default(false),
  slug: text('slug').notNull().unique(),
  published_at: timestamp('published_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// RSVP table
export const rsvpTable = pgTable('rsvp', {
  id: serial('id').primaryKey(),
  invitation_id: integer('invitation_id').notNull(),
  guest_name: text('guest_name').notNull(),
  guest_email: text('guest_email'),
  guest_phone: text('guest_phone'),
  attendance_status: attendanceStatusEnum('attendance_status').notNull().default('belum_konfirmasi'),
  guest_count: integer('guest_count').notNull().default(1),
  message: text('message'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Guest Book table
export const guestBookTable = pgTable('guest_book', {
  id: serial('id').primaryKey(),
  invitation_id: integer('invitation_id').notNull(),
  guest_name: text('guest_name').notNull(),
  message: text('message').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Digital Gifts table
export const digitalGiftsTable = pgTable('digital_gifts', {
  id: serial('id').primaryKey(),
  invitation_id: integer('invitation_id').notNull(),
  sender_name: text('sender_name').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  message: text('message'),
  payment_method: text('payment_method').notNull(),
  payment_proof_url: text('payment_proof_url'),
  status: statusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Wallet Top-ups table
export const walletTopupsTable = pgTable('wallet_topups', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: text('payment_method').notNull(),
  payment_proof_url: text('payment_proof_url'),
  status: statusEnum('status').notNull().default('pending'),
  admin_notes: text('admin_notes'),
  processed_by: integer('processed_by'),
  processed_at: timestamp('processed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// QR Check-ins table
export const qrCheckinsTable = pgTable('qr_checkins', {
  id: serial('id').primaryKey(),
  invitation_id: integer('invitation_id').notNull(),
  guest_name: text('guest_name').notNull(),
  check_in_time: timestamp('check_in_time').defaultNow().notNull(),
  qr_code: text('qr_code').notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  invitations: many(invitationsTable),
  walletTopups: many(walletTopupsTable),
}));

export const invitationsRelations = relations(invitationsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [invitationsTable.user_id],
    references: [usersTable.id],
  }),
  template: one(templatesTable, {
    fields: [invitationsTable.template_id],
    references: [templatesTable.id],
  }),
  package: one(packagesTable, {
    fields: [invitationsTable.package_id],
    references: [packagesTable.id],
  }),
  rsvp: many(rsvpTable),
  guestBook: many(guestBookTable),
  digitalGifts: many(digitalGiftsTable),
  qrCheckins: many(qrCheckinsTable),
}));

export const rsvpRelations = relations(rsvpTable, ({ one }) => ({
  invitation: one(invitationsTable, {
    fields: [rsvpTable.invitation_id],
    references: [invitationsTable.id],
  }),
}));

export const guestBookRelations = relations(guestBookTable, ({ one }) => ({
  invitation: one(invitationsTable, {
    fields: [guestBookTable.invitation_id],
    references: [invitationsTable.id],
  }),
}));

export const digitalGiftsRelations = relations(digitalGiftsTable, ({ one }) => ({
  invitation: one(invitationsTable, {
    fields: [digitalGiftsTable.invitation_id],
    references: [invitationsTable.id],
  }),
}));

export const walletTopupsRelations = relations(walletTopupsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [walletTopupsTable.user_id],
    references: [usersTable.id],
  }),
  processedBy: one(usersTable, {
    fields: [walletTopupsTable.processed_by],
    references: [usersTable.id],
  }),
}));

export const qrCheckinsRelations = relations(qrCheckinsTable, ({ one }) => ({
  invitation: one(invitationsTable, {
    fields: [qrCheckinsTable.invitation_id],
    references: [invitationsTable.id],
  }),
}));

// Export all tables
export const tables = {
  users: usersTable,
  templates: templatesTable,
  packages: packagesTable,
  invitations: invitationsTable,
  rsvp: rsvpTable,
  guestBook: guestBookTable,
  digitalGifts: digitalGiftsTable,
  walletTopups: walletTopupsTable,
  qrCheckins: qrCheckinsTable,
};
