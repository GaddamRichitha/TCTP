import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const project = {
  seedKey: 'tctp-cloud-platform-demo',
  name: 'TCTP Cloud Platform',
  description: 'AI-powered SaaS platform for enterprise resource planning and financial forecasting.',
  duration: 12,
  currency: '$',
  unitLabel: 'Units',
  currentMonth: 3,
  standardHours: 160,
  targetMargin: 35,
  targetVolume: 500,
  salesPeriod: 12,
  churnRate: 3,
  growthRate: 10,
  costBuffer: 15,
  minROI: 15,
  maxPayback: 36,
  minMargin: 20,
  sellingPriceOverride: 0,
};

const costItems = [
  ['labour', 'senior-developer', 'Senior Developer', 8000, 2, 'monthly', 'monthly', 160, 'Full-stack development'],
  ['labour', 'ui-ux-designer', 'UI/UX Designer', 6500, 1, 'monthly', 'monthly', 160, 'Product design & prototyping'],
  ['labour', 'qa-engineer', 'QA Engineer', 45, 1, 'monthly', 'hourly', 160, 'Testing & automation'],
  ['infra', 'aws-ec2-instances', 'AWS EC2 Instances', 320, 3, 'monthly', 'monthly', 0, 'App servers'],
  ['infra', 'cloudfront-cdn', 'CloudFront CDN', 85, 1, 'monthly', 'monthly', 0, 'Content delivery'],
  ['infra', 'rds-postgresql', 'RDS PostgreSQL', 200, 1, 'monthly', 'monthly', 0, 'Primary database'],
  ['apis', 'stripe-payment-processing', 'Stripe Payment Processing', 0.3, 1, 'perunit', 'monthly', 0, 'Per-transaction fee'],
  ['apis', 'sendgrid-email', 'SendGrid Email', 90, 1, 'monthly', 'monthly', 0, 'Transactional & marketing emails'],
  ['llm', 'openai-gpt-4-api', 'OpenAI GPT-4 API', 600, 1, 'monthly', 'monthly', 0, 'AI inference costs'],
  ['llm', 'pinecone-vector-db', 'Pinecone Vector DB', 70, 1, 'monthly', 'monthly', 0, 'Embedding storage'],
  ['overhead', 'office-space', 'Office Space', 2500, 1, 'monthly', 'monthly', 0, 'Coworking space rental'],
  ['overhead', 'legal-compliance', 'Legal & Compliance', 5000, 1, 'onetime', 'monthly', 0, 'Initial legal setup'],
];

const actualHours = {
  'senior-developer': { 1: 155, 2: 175, 3: 155 },
  'ui-ux-designer': { 1: 160, 2: 160, 3: 160 },
  'qa-engineer': { 1: 150, 2: 165, 3: 165 },
};

async function main() {
  const savedProject = await prisma.project.upsert({
    where: { seedKey: project.seedKey },
    create: project,
    update: project,
  });

  for (const [index, item] of costItems.entries()) {
    const [category, key, description, rate, quantity, costType, rateBasis, plannedHours, notes] = item;
    const savedItem = await prisma.costItem.upsert({
      where: { seedKey: `${project.seedKey}:${key}` },
      create: {
        seedKey: `${project.seedKey}:${key}`,
        projectId: savedProject.id,
        category,
        description,
        rate,
        quantity,
        costType,
        rateBasis,
        plannedHours,
        notes,
        sortOrder: index,
      },
      update: {
        projectId: savedProject.id,
        category,
        description,
        rate,
        quantity,
        costType,
        rateBasis,
        plannedHours,
        notes,
        sortOrder: index,
      },
    });

    for (const [month, hours] of Object.entries(actualHours[key] ?? {})) {
      await prisma.timeLog.upsert({
        where: {
          costItemId_month: {
            costItemId: savedItem.id,
            month: Number(month),
          },
        },
        create: {
          costItemId: savedItem.id,
          month: Number(month),
          hours,
        },
        update: { hours },
      });
    }
  }

  const [projectCount, costItemCount, timeLogCount] = await Promise.all([
    prisma.project.count(),
    prisma.costItem.count(),
    prisma.timeLog.count(),
  ]);

  console.log(`Seeded TCTP demo project: ${savedProject.id}`);
  console.log(`Database totals: ${projectCount} projects, ${costItemCount} cost items, ${timeLogCount} time logs`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
