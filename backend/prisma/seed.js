const { PrismaClient, WorkspaceRole, TaskPriority, TaskStatus, SubscriptionPlan, SubscriptionStatus, WorkspaceInvitationStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function ensureUser({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
    },
  });
}

async function ensureWorkspace({ name, ownerId }) {
  const existing = await prisma.workspace.findFirst({
    where: { name, ownerId },
  });

  if (existing) {
    return existing;
  }

  return prisma.workspace.create({
    data: {
      name,
      ownerId,
    },
  });
}

async function ensureMembership({ workspaceId, userId, role }) {
  return prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    update: { role },
    create: {
      workspaceId,
      userId,
      role,
    },
  });
}

async function ensureProject({ workspaceId, name, description, createdBy }) {
  const existing = await prisma.project.findFirst({
    where: { workspaceId, name },
  });

  if (existing) {
    return existing;
  }

  return prisma.project.create({
    data: {
      workspaceId,
      name,
      description,
      createdBy,
    },
  });
}

async function ensureTask({
  projectId,
  title,
  description,
  status,
  priority,
  assignedTo,
  createdBy,
}) {
  const existing = await prisma.task.findFirst({
    where: { projectId, title },
  });

  if (existing) {
    return existing;
  }

  return prisma.task.create({
    data: {
      projectId,
      title,
      description,
      status,
      priority,
      assignedTo,
      createdBy,
    },
  });
}

async function ensureSubscription({ workspaceId, plan, status, stripeCustomerId, stripeSubId }) {
  return prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      plan,
      status,
      stripeCustomerId,
      stripeSubId,
    },
    create: {
      workspaceId,
      plan,
      status,
      stripeCustomerId,
      stripeSubId,
    },
  });
}

async function ensureInvitation({
  workspaceId,
  email,
  role,
  token,
  status,
  invitedByUserId,
  acceptedByUserId,
  expiresAt,
  acceptedAt,
}) {
  return prisma.workspaceInvitation.upsert({
    where: { token },
    update: {
      status,
      acceptedByUserId,
      acceptedAt,
      expiresAt,
    },
    create: {
      workspaceId,
      email,
      role,
      token,
      status,
      invitedByUserId,
      acceptedByUserId,
      expiresAt,
      acceptedAt,
    },
  });
}

async function ensureAuditLog({
  workspaceId,
  actorUserId,
  entityType,
  entityId,
  action,
  metadata,
}) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      workspaceId,
      entityType,
      entityId,
      action,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId,
      entityType,
      entityId,
      action,
      metadata,
    },
  });
}

async function main() {
  const demoPassword = 'password123';

  const ian = await ensureUser({
    name: 'Ian',
    email: 'ian@example.com',
    password: demoPassword,
  });

  const secondUser = await ensureUser({
    name: 'User2',
    email: 'seconduser@example.com',
    password: demoPassword,
  });

  const alex = await ensureUser({
    name: 'Alex Jacobs',
    email: 'alex@example.com',
    password: demoPassword,
  });

  const userTwo = await ensureUser({
    name: 'User 2',
    email: 'user2@example.com',
    password: demoPassword,
  });

  const designTeam = await ensureWorkspace({
    name: 'Design Team',
    ownerId: ian.id,
  });

  const dbSolutions = await ensureWorkspace({
    name: 'Database Solutions',
    ownerId: ian.id,
  });

  const studioOps = await ensureWorkspace({
    name: 'Studio Ops',
    ownerId: alex.id,
  });

  await ensureMembership({
    workspaceId: designTeam.id,
    userId: ian.id,
    role: WorkspaceRole.OWNER,
  });
  await ensureMembership({
    workspaceId: designTeam.id,
    userId: userTwo.id,
    role: WorkspaceRole.MEMBER,
  });

  await ensureMembership({
    workspaceId: dbSolutions.id,
    userId: ian.id,
    role: WorkspaceRole.OWNER,
  });
  await ensureMembership({
    workspaceId: dbSolutions.id,
    userId: userTwo.id,
    role: WorkspaceRole.ADMIN,
  });
  await ensureMembership({
    workspaceId: dbSolutions.id,
    userId: alex.id,
    role: WorkspaceRole.MEMBER,
  });

  await ensureMembership({
    workspaceId: studioOps.id,
    userId: alex.id,
    role: WorkspaceRole.OWNER,
  });
  await ensureMembership({
    workspaceId: studioOps.id,
    userId: ian.id,
    role: WorkspaceRole.ADMIN,
  });

  const websiteRedesign = await ensureProject({
    workspaceId: designTeam.id,
    name: 'Website Redesign',
    description: 'Refresh the public marketing site',
    createdBy: ian.id,
  });

  const databaseCreation = await ensureProject({
    workspaceId: designTeam.id,
    name: 'Database Creation',
    description: 'Create database schemas and content',
    createdBy: ian.id,
  });

  const sprintLaunch = await ensureProject({
    workspaceId: dbSolutions.id,
    name: 'Sprint Launch',
    description: 'Coordinate launch planning across product and engineering',
    createdBy: userTwo.id,
  });

  const createSchemaTask = await ensureTask({
    projectId: databaseCreation.id,
    title: 'Create Schema',
    description: 'Build the database schemas for database usage',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    assignedTo: null,
    createdBy: ian.id,
  });

  const implementLoginFormTask = await ensureTask({
    projectId: websiteRedesign.id,
    title: 'Implement login form',
    description: 'Build the frontend login form and connect it to the API.',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    assignedTo: userTwo.id,
    createdBy: ian.id,
  });

  await ensureTask({
    projectId: sprintLaunch.id,
    title: 'Refresh billing page content',
    description: 'Improve subscription copy and invoice guidance.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    assignedTo: alex.id,
    createdBy: ian.id,
  });

  await ensureTask({
    projectId: sprintLaunch.id,
    title: 'Prepare onboarding checklist',
    description: 'Define first-week onboarding checklist for the rollout.',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    assignedTo: alex.id,
    createdBy: secondUser.id,
  });

  const databaseSolutionsSubscription = await ensureSubscription({
    workspaceId: dbSolutions.id,
    plan: SubscriptionPlan.PRO,
    status: SubscriptionStatus.ACTIVE,
    stripeCustomerId: 'cus_demo_database_solutions',
    stripeSubId: 'sub_demo_database_solutions',
  });

  await ensureSubscription({
    workspaceId: designTeam.id,
    plan: SubscriptionPlan.PRO,
    status: SubscriptionStatus.ACTIVE,
    stripeCustomerId: 'cus_demo_design_team',
    stripeSubId: 'sub_demo_design_team',
  });

  await ensureInvitation({
    workspaceId: designTeam.id,
    email: 'user2@example.com',
    role: WorkspaceRole.MEMBER,
    token: 'ea690115-097d-4997-9921-717b6aaed7ee',
    status: WorkspaceInvitationStatus.ACCEPTED,
    invitedByUserId: ian.id,
    acceptedByUserId: userTwo.id,
    expiresAt: new Date('2026-03-24T06:50:43.764Z'),
    acceptedAt: new Date('2026-03-17T06:52:13.000Z'),
  });

  await ensureInvitation({
    workspaceId: studioOps.id,
    email: 'teammate@example.com',
    role: WorkspaceRole.ADMIN,
    token: 'demo-studio-ops-invite',
    status: WorkspaceInvitationStatus.PENDING,
    invitedByUserId: alex.id,
    acceptedByUserId: null,
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
  });

  await ensureAuditLog({
    workspaceId: dbSolutions.id,
    actorUserId: ian.id,
    entityType: 'SUBSCRIPTION',
    entityId: databaseSolutionsSubscription.id,
    action: 'billing.subscription_synced',
    metadata: { plan: 'PRO', status: 'ACTIVE' },
  });

  await ensureAuditLog({
    workspaceId: dbSolutions.id,
    actorUserId: ian.id,
    entityType: 'WORKSPACE_MEMBER',
    entityId: userTwo.id,
    action: 'workspace.member_added',
    metadata: { email: userTwo.email, role: 'ADMIN' },
  });

  await ensureAuditLog({
    workspaceId: designTeam.id,
    actorUserId: ian.id,
    entityType: 'TASK',
    entityId: implementLoginFormTask.id,
    action: 'task.status_updated',
    metadata: { project: 'Website Redesign', status: 'TODO' },
  });

  await ensureAuditLog({
    workspaceId: designTeam.id,
    actorUserId: ian.id,
    entityType: 'TASK',
    entityId: createSchemaTask.id,
    action: 'task.created',
    metadata: { project: 'Database Creation', priority: 'HIGH' },
  });

  console.log('Seed completed.');
  console.log('Demo users:');
  console.log('- ian@example.com / password123');
  console.log('- seconduser@example.com / password123');
  console.log('- alex@example.com / password123');
  console.log('- user2@example.com / password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
