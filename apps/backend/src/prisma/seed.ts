/**
 * Database Seed Script
 * Creates test data for development
 *
 * Test Credentials (for easy testing):
 * - Admin: admin@example.com / Admin123!
 * - User 1: user1@example.com / User123!
 * - User 2: user2@example.com / User123!
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';

/**
 * Create (or refresh) a credential login for a seeded user.
 *
 * Better Auth stores passwords on Account rows with providerId 'credential',
 * hashed with its own scrypt parameters — NOT on User.hashedPassword, and not
 * with bcrypt. An earlier version of this seed wrote a bcrypt hash to
 * User.hashedPassword, which meant none of the seeded accounts could actually
 * sign in: the column is not one Better Auth ever reads.
 */
const CREDENTIAL_ISSUER = 'local:credential';

async function setCredentialPassword(userId: string, password: string): Promise<void> {
  const hashed = await hashPassword(password);
  const existing = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { id: true },
  });
  if (existing) {
    await prisma.account.update({ where: { id: existing.id }, data: { password: hashed } });
    return;
  }
  await prisma.account.create({
    data: {
      userId,
      accountId: userId,
      providerId: 'credential',
      // Better Auth matches the credential account on (providerId, issuer,
      // accountId). `local:credential` is the synthetic issuer it uses for
      // providers that have none of their own; omitting it makes the row
      // invisible to sign-in.
      issuer: CREDENTIAL_ISSUER,
      password: hashed,
    },
  });
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // =============================================================================
  // USERS
  // =============================================================================

  console.log('👤 Creating users...');

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      emailVerified: true,
      role: 'admin',
    },
  });
  await setCredentialPassword(admin.id, 'Admin123!');
  console.log(`  ✓ Admin user created: ${admin.email}`);

  // Regular users
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      email: 'user1@example.com',
      name: 'John Doe',
      emailVerified: true,
      role: 'user',
    },
  });
  await setCredentialPassword(user1.id, 'User123!');
  console.log(`  ✓ User 1 created: ${user1.email}`);

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      email: 'user2@example.com',
      name: 'Jane Smith',
      emailVerified: true,
      role: 'user',
    },
  });
  await setCredentialPassword(user2.id, 'User123!');
  console.log(`  ✓ User 2 created: ${user2.email}`);

  // Unverified user (for testing email verification)
  const user3 = await prisma.user.upsert({
    where: { email: 'user3@example.com' },
    update: {},
    create: {
      email: 'user3@example.com',
      name: 'Bob Johnson',
      emailVerified: false,
      role: 'user',
    },
  });
  await setCredentialPassword(user3.id, 'User123!');
  console.log(`  ✓ User 3 created (unverified): ${user3.email}`);

  // =============================================================================
  // ORGANIZATIONS
  // =============================================================================

  console.log('\n🏢 Creating organizations...');

  // Organization 1: Acme Corporation
  const acme = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      logo: 'https://via.placeholder.com/150/007bff/ffffff?text=ACME',
      metadata: {
        industry: 'Technology',
        size: 'medium',
        founded: '2020',
      },
    },
  });
  console.log(`  ✓ Organization created: ${acme.name}`);

  // Add members to Acme
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: acme.id,
        userId: user1.id,
      },
    },
    update: {},
    create: {
      organizationId: acme.id,
      userId: user1.id,
      role: 'owner',
    },
  });
  console.log(`    • ${user1.name} added as owner`);

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: acme.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      organizationId: acme.id,
      userId: user2.id,
      role: 'member',
    },
  });
  console.log(`    • ${user2.name} added as member`);

  // Organization 2: Tech Startup
  const techStartup = await prisma.organization.upsert({
    where: { slug: 'tech-startup' },
    update: {},
    create: {
      name: 'Tech Startup Inc',
      slug: 'tech-startup',
      logo: 'https://via.placeholder.com/150/28a745/ffffff?text=Tech',
      metadata: {
        industry: 'Software',
        size: 'startup',
        founded: '2023',
      },
    },
  });
  console.log(`  ✓ Organization created: ${techStartup.name}`);

  // Add members to Tech Startup
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: techStartup.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      organizationId: techStartup.id,
      userId: user2.id,
      role: 'owner',
    },
  });
  console.log(`    • ${user2.name} added as owner`);

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: techStartup.id,
        userId: user1.id,
      },
    },
    update: {},
    create: {
      organizationId: techStartup.id,
      userId: user1.id,
      role: 'admin',
    },
  });
  console.log(`    • ${user1.name} added as admin`);

  // =============================================================================
  // ORGANIZATION INVITATIONS
  // =============================================================================

  console.log('\n📧 Creating pending invitations...');

  const invitation = await prisma.organizationInvitation.upsert({
    where: {
      organizationId_email: {
        organizationId: acme.id,
        email: 'newuser@example.com',
      },
    },
    update: {},
    create: {
      organizationId: acme.id,
      email: 'newuser@example.com',
      role: 'member',
      invitedBy: user1.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending',
    },
  });
  console.log(`  ✓ Invitation created for: ${invitation.email}`);

  // =============================================================================
  // PROJECTS
  // =============================================================================

  console.log('\n📁 Creating projects...');

  // Project 1: Acme's Website Redesign
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with modern design and improved UX',
      organizationId: acme.id,
      createdBy: user1.id,
    },
  });
  console.log(`  ✓ Project created: ${project1.name}`);

  // Project 2: Mobile App Development
  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Native iOS and Android app for customer engagement',
      organizationId: acme.id,
      createdBy: user1.id,
    },
  });
  console.log(`  ✓ Project created: ${project2.name}`);

  // Project 3: Tech Startup's MVP
  const project3 = await prisma.project.create({
    data: {
      name: 'MVP Development',
      description: 'Build minimum viable product for market validation',
      organizationId: techStartup.id,
      createdBy: user2.id,
    },
  });
  console.log(`  ✓ Project created: ${project3.name}`);

  // Project 4: Personal Project (no organization)
  const project4 = await prisma.project.create({
    data: {
      name: 'Personal Portfolio',
      description: 'Build a personal portfolio website',
      organizationId: null,
      createdBy: user1.id,
    },
  });
  console.log(`  ✓ Project created: ${project4.name} (personal)`);

  // =============================================================================
  // TASKS
  // =============================================================================

  console.log('\n✅ Creating tasks...');

  const tasks = await prisma.task.createMany({
    data: [
      // Website Redesign tasks
      {
        title: 'Design mockups',
        description: 'Create design mockups for all pages',
        status: 'done',
        priority: 'high',
        projectId: project1.id,
        assignedTo: user2.id,
      },
      {
        title: 'Frontend implementation',
        description: 'Build responsive frontend based on mockups',
        status: 'in_progress',
        priority: 'high',
        projectId: project1.id,
        assignedTo: user2.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Content migration',
        description: 'Migrate existing content to new site structure',
        status: 'todo',
        priority: 'medium',
        projectId: project1.id,
        assignedTo: user1.id,
      },
      {
        title: 'SEO optimization',
        description: 'Implement SEO best practices',
        status: 'todo',
        priority: 'medium',
        projectId: project1.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Deploy to production',
        description: 'Deploy website to production environment',
        status: 'todo',
        priority: 'high',
        projectId: project1.id,
      },
      // Mobile App tasks
      {
        title: 'Define app architecture',
        description: 'Plan technical architecture and tech stack',
        status: 'done',
        priority: 'high',
        projectId: project2.id,
        assignedTo: user1.id,
      },
      {
        title: 'UI/UX design',
        description: 'Design user interface and user experience',
        status: 'in_progress',
        priority: 'high',
        projectId: project2.id,
        assignedTo: user2.id,
      },
      {
        title: 'iOS development',
        description: 'Develop iOS application',
        status: 'todo',
        priority: 'high',
        projectId: project2.id,
      },
      {
        title: 'Android development',
        description: 'Develop Android application',
        status: 'todo',
        priority: 'high',
        projectId: project2.id,
      },
      // MVP Development tasks
      {
        title: 'Market research',
        description: 'Research target market and competitors',
        status: 'done',
        priority: 'high',
        projectId: project3.id,
        assignedTo: user2.id,
      },
      {
        title: 'Core features implementation',
        description: 'Build essential features for MVP',
        status: 'in_progress',
        priority: 'high',
        projectId: project3.id,
        assignedTo: user1.id,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'User testing',
        description: 'Conduct user testing sessions',
        status: 'todo',
        priority: 'medium',
        projectId: project3.id,
      },
      // Personal Portfolio tasks
      {
        title: 'Portfolio design',
        description: 'Design personal portfolio layout',
        status: 'in_progress',
        priority: 'medium',
        projectId: project4.id,
        assignedTo: user1.id,
      },
      {
        title: 'Add project showcase',
        description: 'Add past projects to portfolio',
        status: 'todo',
        priority: 'low',
        projectId: project4.id,
        assignedTo: user1.id,
      },
    ],
  });
  console.log(`  ✓ Created ${tasks.count} tasks`);

  // =============================================================================
  // SUBSCRIPTIONS (Free plan by default)
  // =============================================================================

  console.log('\n💳 Creating subscriptions...');

  await prisma.subscription.upsert({
    where: { organizationId: acme.id },
    update: {},
    create: {
      organizationId: acme.id,
      stripeCustomerId: 'cus_test_acme',
      status: 'active',
      plan: 'pro',
      billingInterval: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  ✓ Acme Corp: Pro plan (test data)`);

  await prisma.subscription.upsert({
    where: { organizationId: techStartup.id },
    update: {},
    create: {
      organizationId: techStartup.id,
      stripeCustomerId: 'cus_test_techstartup',
      status: 'inactive',
      plan: 'free',
    },
  });
  console.log(`  ✓ Tech Startup: Free plan`);

  // =============================================================================
  // SUMMARY
  // =============================================================================

  console.log('\n✨ Database seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`  • Users: 4 (1 admin, 3 regular users)`);
  console.log(`  • Organizations: 2`);
  console.log(`  • Organization members: 4`);
  console.log(`  • Pending invitations: 1`);
  console.log(`  • Projects: 4`);
  console.log(`  • Tasks: ${tasks.count}`);
  console.log(`  • Subscriptions: 2 (1 Pro, 1 Free)`);
  console.log('\n🔑 Test credentials:');
  console.log('  Admin: admin@example.com / Admin123!');
  console.log('  User 1: user1@example.com / User123!');
  console.log('  User 2: user2@example.com / User123!');
  console.log('  User 3 (unverified): user3@example.com / User123!');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
