
import { z } from 'zod';

// User/Member schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  role: z.enum(['admin', 'member']),
  wallet_balance: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  phone: z.string().nullable(),
  role: z.enum(['admin', 'member']).default('member')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Template schemas
export const templateSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  preview_image: z.string().nullable(),
  template_data: z.string(), // JSON string containing template structure
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Template = z.infer<typeof templateSchema>;

export const createTemplateInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  preview_image: z.string().nullable(),
  template_data: z.string(),
  is_active: z.boolean().default(true)
});

export type CreateTemplateInput = z.infer<typeof createTemplateInputSchema>;

// Package schemas
export const packageSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  features: z.string(), // JSON string containing feature list
  max_guests: z.number().int().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Package = z.infer<typeof packageSchema>;

export const createPackageInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().positive(),
  features: z.string(),
  max_guests: z.number().int().positive().nullable(),
  is_active: z.boolean().default(true)
});

export type CreatePackageInput = z.infer<typeof createPackageInputSchema>;

// Invitation schemas
export const invitationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  template_id: z.number(),
  package_id: z.number(),
  title: z.string(),
  bride_name: z.string(),
  groom_name: z.string(),
  wedding_date: z.coerce.date(),
  ceremony_time: z.string().nullable(),
  ceremony_location: z.string().nullable(),
  reception_time: z.string().nullable(),
  reception_location: z.string().nullable(),
  love_story: z.string().nullable(),
  background_music_url: z.string().nullable(),
  gallery_photos: z.string(), // JSON array of photo URLs
  gallery_videos: z.string(), // JSON array of video URLs
  live_stream_url: z.string().nullable(),
  rsvp_enabled: z.boolean(),
  guest_book_enabled: z.boolean(),
  digital_gift_enabled: z.boolean(),
  qr_checkin_enabled: z.boolean(),
  is_published: z.boolean(),
  slug: z.string(),
  published_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invitation = z.infer<typeof invitationSchema>;

export const createInvitationInputSchema = z.object({
  template_id: z.number(),
  package_id: z.number(),
  title: z.string(),
  bride_name: z.string(),
  groom_name: z.string(),
  wedding_date: z.coerce.date(),
  ceremony_time: z.string().nullable(),
  ceremony_location: z.string().nullable(),
  reception_time: z.string().nullable(),
  reception_location: z.string().nullable(),
  love_story: z.string().nullable(),
  background_music_url: z.string().nullable(),
  gallery_photos: z.string().default('[]'),
  gallery_videos: z.string().default('[]'),
  live_stream_url: z.string().nullable(),
  rsvp_enabled: z.boolean().default(true),
  guest_book_enabled: z.boolean().default(true),
  digital_gift_enabled: z.boolean().default(true),
  qr_checkin_enabled: z.boolean().default(false)
});

export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

export const updateInvitationInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  bride_name: z.string().optional(),
  groom_name: z.string().optional(),
  wedding_date: z.coerce.date().optional(),
  ceremony_time: z.string().nullable().optional(),
  ceremony_location: z.string().nullable().optional(),
  reception_time: z.string().nullable().optional(),
  reception_location: z.string().nullable().optional(),
  love_story: z.string().nullable().optional(),
  background_music_url: z.string().nullable().optional(),
  gallery_photos: z.string().optional(),
  gallery_videos: z.string().optional(),
  live_stream_url: z.string().nullable().optional(),
  rsvp_enabled: z.boolean().optional(),
  guest_book_enabled: z.boolean().optional(),
  digital_gift_enabled: z.boolean().optional(),
  qr_checkin_enabled: z.boolean().optional()
});

export type UpdateInvitationInput = z.infer<typeof updateInvitationInputSchema>;

// RSVP schemas
export const rsvpSchema = z.object({
  id: z.number(),
  invitation_id: z.number(),
  guest_name: z.string(),
  guest_email: z.string().nullable(),
  guest_phone: z.string().nullable(),
  attendance_status: z.enum(['hadir', 'tidak_hadir', 'belum_konfirmasi']),
  guest_count: z.number().int(),
  message: z.string().nullable(),
  created_at: z.coerce.date()
});

export type RSVP = z.infer<typeof rsvpSchema>;

export const createRSVPInputSchema = z.object({
  invitation_id: z.number(),
  guest_name: z.string(),
  guest_email: z.string().nullable(),
  guest_phone: z.string().nullable(),
  attendance_status: z.enum(['hadir', 'tidak_hadir', 'belum_konfirmasi']),
  guest_count: z.number().int().positive(),
  message: z.string().nullable()
});

export type CreateRSVPInput = z.infer<typeof createRSVPInputSchema>;

// Guest Book schemas
export const guestBookSchema = z.object({
  id: z.number(),
  invitation_id: z.number(),
  guest_name: z.string(),
  message: z.string(),
  created_at: z.coerce.date()
});

export type GuestBook = z.infer<typeof guestBookSchema>;

export const createGuestBookInputSchema = z.object({
  invitation_id: z.number(),
  guest_name: z.string(),
  message: z.string()
});

export type CreateGuestBookInput = z.infer<typeof createGuestBookInputSchema>;

// Digital Gift schemas
export const digitalGiftSchema = z.object({
  id: z.number(),
  invitation_id: z.number(),
  sender_name: z.string(),
  amount: z.number(),
  message: z.string().nullable(),
  payment_method: z.string(),
  payment_proof_url: z.string().nullable(),
  status: z.enum(['pending', 'confirmed', 'rejected']),
  created_at: z.coerce.date()
});

export type DigitalGift = z.infer<typeof digitalGiftSchema>;

export const createDigitalGiftInputSchema = z.object({
  invitation_id: z.number(),
  sender_name: z.string(),
  amount: z.number().positive(),
  message: z.string().nullable(),
  payment_method: z.string(),
  payment_proof_url: z.string().nullable()
});

export type CreateDigitalGiftInput = z.infer<typeof createDigitalGiftInputSchema>;

// Wallet Top-up schemas
export const walletTopupSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number(),
  payment_method: z.string(),
  payment_proof_url: z.string().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']),
  admin_notes: z.string().nullable(),
  processed_by: z.number().nullable(),
  processed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type WalletTopup = z.infer<typeof walletTopupSchema>;

export const createWalletTopupInputSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.string(),
  payment_proof_url: z.string().nullable()
});

export type CreateWalletTopupInput = z.infer<typeof createWalletTopupInputSchema>;

export const processWalletTopupInputSchema = z.object({
  id: z.number(),
  status: z.enum(['approved', 'rejected']),
  admin_notes: z.string().nullable()
});

export type ProcessWalletTopupInput = z.infer<typeof processWalletTopupInputSchema>;

// QR Check-in schemas
export const qrCheckinSchema = z.object({
  id: z.number(),
  invitation_id: z.number(),
  guest_name: z.string(),
  check_in_time: z.coerce.date(),
  qr_code: z.string()
});

export type QRCheckin = z.infer<typeof qrCheckinSchema>;

export const createQRCheckinInputSchema = z.object({
  invitation_id: z.number(),
  qr_code: z.string()
});

export type CreateQRCheckinInput = z.infer<typeof createQRCheckinInputSchema>;

// Statistics schemas
export const statisticsSchema = z.object({
  total_members: z.number(),
  total_invitations: z.number(),
  published_invitations: z.number(),
  total_rsvp: z.number(),
  total_digital_gifts: z.number(),
  total_wallet_balance: z.number(),
  pending_topups: z.number(),
  revenue_this_month: z.number()
});

export type Statistics = z.infer<typeof statisticsSchema>;
