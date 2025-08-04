
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  templatesTable, 
  packagesTable, 
  invitationsTable, 
  rsvpTable, 
  digitalGiftsTable, 
  walletTopupsTable 
} from '../db/schema';
import { getStatistics, getUserStatistics } from '../handlers/statistics';

describe('Statistics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getStatistics', () => {
    it('should return zero statistics for empty database', async () => {
      const stats = await getStatistics();

      expect(stats.total_members).toBe(0);
      expect(stats.total_invitations).toBe(0);
      expect(stats.published_invitations).toBe(0);
      expect(stats.total_rsvp).toBe(0);
      expect(stats.total_digital_gifts).toBe(0);
      expect(stats.total_wallet_balance).toBe(0);
      expect(stats.pending_topups).toBe(0);
      expect(stats.revenue_this_month).toBe(0);
    });

    it('should count members correctly', async () => {
      // Create admin and members
      await db.insert(usersTable).values([
        {
          email: 'admin@test.com',
          password: 'password123',
          name: 'Admin User',
          role: 'admin',
          wallet_balance: '100.00'
        },
        {
          email: 'member1@test.com',
          password: 'password123',
          name: 'Member One',
          role: 'member',
          wallet_balance: '50.00'
        },
        {
          email: 'member2@test.com',
          password: 'password123',
          name: 'Member Two',
          role: 'member',
          wallet_balance: '75.00'
        }
      ]).execute();

      const stats = await getStatistics();

      expect(stats.total_members).toBe(2); // Only members, not admin
      expect(stats.total_wallet_balance).toBe(225.00); // Sum of all wallet balances
    });

    it('should count invitations and published invitations correctly', async () => {
      // Create prerequisite data
      const users = await db.insert(usersTable).values({
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
        role: 'member'
      }).returning().execute();

      const templates = await db.insert(templatesTable).values({
        name: 'Test Template',
        template_data: '{"layout": "default"}'
      }).returning().execute();

      const packages = await db.insert(packagesTable).values({
        name: 'Basic Package',
        price: '100.00',
        features: '["feature1", "feature2"]'
      }).returning().execute();

      // Create invitations
      await db.insert(invitationsTable).values([
        {
          user_id: users[0].id,
          template_id: templates[0].id,
          package_id: packages[0].id,
          title: 'Wedding 1',
          bride_name: 'Jane',
          groom_name: 'John',
          wedding_date: new Date('2024-06-15'),
          slug: 'wedding-1',
          is_published: true,
          published_at: new Date()
        },
        {
          user_id: users[0].id,
          template_id: templates[0].id,
          package_id: packages[0].id,
          title: 'Wedding 2',
          bride_name: 'Alice',
          groom_name: 'Bob',
          wedding_date: new Date('2024-07-20'),
          slug: 'wedding-2',
          is_published: false
        }
      ]).execute();

      const stats = await getStatistics();

      expect(stats.total_invitations).toBe(2);
      expect(stats.published_invitations).toBe(1);
    });

    it('should count RSVP responses correctly', async () => {
      // Create prerequisite data
      const users = await db.insert(usersTable).values({
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
        role: 'member'
      }).returning().execute();

      const templates = await db.insert(templatesTable).values({
        name: 'Test Template',
        template_data: '{"layout": "default"}'
      }).returning().execute();

      const packages = await db.insert(packagesTable).values({
        name: 'Basic Package',
        price: '100.00',
        features: '["feature1"]'
      }).returning().execute();

      const invitations = await db.insert(invitationsTable).values({
        user_id: users[0].id,
        template_id: templates[0].id,
        package_id: packages[0].id,
        title: 'Test Wedding',
        bride_name: 'Jane',
        groom_name: 'John',
        wedding_date: new Date('2024-06-15'),
        slug: 'test-wedding'
      }).returning().execute();

      // Create RSVP responses
      await db.insert(rsvpTable).values([
        {
          invitation_id: invitations[0].id,
          guest_name: 'Guest 1',
          attendance_status: 'hadir',
          guest_count: 2
        },
        {
          invitation_id: invitations[0].id,
          guest_name: 'Guest 2',
          attendance_status: 'tidak_hadir',
          guest_count: 1
        }
      ]).execute();

      const stats = await getStatistics();

      expect(stats.total_rsvp).toBe(2);
    });

    it('should count digital gifts and calculate revenue correctly', async () => {
      // Create prerequisite data
      const users = await db.insert(usersTable).values({
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
        role: 'member'
      }).returning().execute();

      const templates = await db.insert(templatesTable).values({
        name: 'Test Template',
        template_data: '{"layout": "default"}'
      }).returning().execute();

      const packages = await db.insert(packagesTable).values({
        name: 'Basic Package',
        price: '100.00',
        features: '["feature1"]'
      }).returning().execute();

      const invitations = await db.insert(invitationsTable).values({
        user_id: users[0].id,
        template_id: templates[0].id,
        package_id: packages[0].id,
        title: 'Test Wedding',
        bride_name: 'Jane',
        groom_name: 'John',
        wedding_date: new Date('2024-06-15'),
        slug: 'test-wedding'
      }).returning().execute();

      // Create digital gifts - some this month, some confirmed
      const currentDate = new Date();
      const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 10);
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15);

      await db.insert(digitalGiftsTable).values([
        {
          invitation_id: invitations[0].id,
          sender_name: 'Sender 1',
          amount: '100.00',
          payment_method: 'Bank Transfer',
          status: 'confirmed',
          created_at: thisMonth
        },
        {
          invitation_id: invitations[0].id,
          sender_name: 'Sender 2',
          amount: '50.00',
          payment_method: 'E-wallet',
          status: 'pending',
          created_at: thisMonth
        },
        {
          invitation_id: invitations[0].id,
          sender_name: 'Sender 3',
          amount: '75.00',
          payment_method: 'Bank Transfer',
          status: 'confirmed',
          created_at: lastMonth
        }
      ]).execute();

      const stats = await getStatistics();

      expect(stats.total_digital_gifts).toBe(3);
      expect(stats.revenue_this_month).toBe(100.00); // Only confirmed gifts from this month
    });

    it('should count pending wallet top-ups correctly', async () => {
      // Create user
      const users = await db.insert(usersTable).values({
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
        role: 'member'
      }).returning().execute();

      // Create wallet top-ups with different statuses
      await db.insert(walletTopupsTable).values([
        {
          user_id: users[0].id,
          amount: '100.00',
          payment_method: 'Bank Transfer',
          status: 'pending'
        },
        {
          user_id: users[0].id,
          amount: '50.00',
          payment_method: 'E-wallet',
          status: 'approved'
        },
        {
          user_id: users[0].id,
          amount: '25.00',
          payment_method: 'Bank Transfer',
          status: 'pending'
        }
      ]).execute();

      const stats = await getStatistics();

      expect(stats.pending_topups).toBe(2); // Only pending status
    });
  });

  describe('getUserStatistics', () => {
    it('should return zero statistics for user with no data', async () => {
      const stats = await getUserStatistics(999);

      expect(stats.total_invitations).toBe(0);
      expect(stats.published_invitations).toBe(0);
      expect(stats.total_rsvp).toBe(0);
      expect(stats.total_digital_gifts).toBe(0);
    });

    it('should return correct user-specific statistics', async () => {
      // Create users
      const users = await db.insert(usersTable).values([
        {
          email: 'user1@test.com',
          password: 'password123',
          name: 'User One',
          role: 'member'
        },
        {
          email: 'user2@test.com',
          password: 'password123',
          name: 'User Two',
          role: 'member'
        }
      ]).returning().execute();

      const templates = await db.insert(templatesTable).values({
        name: 'Test Template',
        template_data: '{"layout": "default"}'
      }).returning().execute();

      const packages = await db.insert(packagesTable).values({
        name: 'Basic Package',
        price: '100.00',
        features: '["feature1"]'
      }).returning().execute();

      // Create invitations for both users
      const invitations = await db.insert(invitationsTable).values([
        {
          user_id: users[0].id,
          template_id: templates[0].id,
          package_id: packages[0].id,
          title: 'User 1 Wedding 1',
          bride_name: 'Jane',
          groom_name: 'John',
          wedding_date: new Date('2024-06-15'),
          slug: 'user1-wedding1',
          is_published: true,
          published_at: new Date()
        },
        {
          user_id: users[0].id,
          template_id: templates[0].id,
          package_id: packages[0].id,
          title: 'User 1 Wedding 2',
          bride_name: 'Alice',
          groom_name: 'Bob',
          wedding_date: new Date('2024-07-20'),
          slug: 'user1-wedding2',
          is_published: false
        },
        {
          user_id: users[1].id,
          template_id: templates[0].id,
          package_id: packages[0].id,
          title: 'User 2 Wedding',
          bride_name: 'Eve',
          groom_name: 'Adam',
          wedding_date: new Date('2024-08-10'),
          slug: 'user2-wedding',
          is_published: true,
          published_at: new Date()
        }
      ]).returning().execute();

      // Create RSVP responses for user 1's invitations
      await db.insert(rsvpTable).values([
        {
          invitation_id: invitations[0].id,
          guest_name: 'Guest 1',
          attendance_status: 'hadir',
          guest_count: 2
        },
        {
          invitation_id: invitations[1].id,
          guest_name: 'Guest 2',
          attendance_status: 'tidak_hadir',
          guest_count: 1
        }
      ]).execute();

      // Create digital gifts for user 1's invitations
      await db.insert(digitalGiftsTable).values([
        {
          invitation_id: invitations[0].id,
          sender_name: 'Sender 1',
          amount: '100.00',
          payment_method: 'Bank Transfer',
          status: 'confirmed'
        }
      ]).execute();

      const user1Stats = await getUserStatistics(users[0].id);

      expect(user1Stats.total_invitations).toBe(2);
      expect(user1Stats.published_invitations).toBe(1);
      expect(user1Stats.total_rsvp).toBe(2);
      expect(user1Stats.total_digital_gifts).toBe(1);

      // Verify user 2 has different stats
      const user2Stats = await getUserStatistics(users[1].id);

      expect(user2Stats.total_invitations).toBe(1);
      expect(user2Stats.published_invitations).toBe(1);
      expect(user2Stats.total_rsvp).toBe(0);
      expect(user2Stats.total_digital_gifts).toBe(0);
    });
  });
});
