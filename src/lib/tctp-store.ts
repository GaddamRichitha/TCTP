'use client';
import { create } from 'zustand';
import type { CostItem, ProjectSettings, PageKey, Category } from './tctp-types';
import type { AllComputed } from './tctp-calcs';
import { computeAll } from './tctp-calcs';
import { generateId } from './tctp-utils';

const defaultProject: ProjectSettings = {
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

function makeDefaultCostItems(): Record<string, CostItem[]> {
  const labour: CostItem[] = [
    { id: generateId(), description: 'Senior Developer', rate: 8000, quantity: 2, costType: 'monthly', rateBasis: 'monthly', plannedHours: 160, notes: 'Full-stack development' },
    { id: generateId(), description: 'UI/UX Designer', rate: 6500, quantity: 1, costType: 'monthly', rateBasis: 'monthly', plannedHours: 160, notes: 'Product design & prototyping' },
    { id: generateId(), description: 'QA Engineer', rate: 45, quantity: 1, costType: 'monthly', rateBasis: 'hourly', plannedHours: 160, notes: 'Testing & automation' },
  ];
  const infra: CostItem[] = [
    { id: generateId(), description: 'AWS EC2 Instances', rate: 320, quantity: 3, costType: 'monthly', rateBasis: 'monthly', plannedHours: 0, notes: 'App servers' },
    { id: generateId(), description: 'CloudFront CDN', rate: 85, quantity: 1, costType: 'monthly', rateBasis: 'monthly', plannedHours: 0, notes: 'Content delivery' },
    { id: generateId(), description: 'RDS PostgreSQL', rate: 200, quantity: 1, costType: 'monthly', rateBasis: 'monthly', plannedHours: 0, notes: 'Primary database' },
  ];
  const apis: CostItem[] = [
    { id: generateId(), description: 'Stripe Payment Processing', rate: 0.30, quantity: 1, costType: 'perunit', rateBasis: 'monthly', plannedHours: 0, notes: 'Per-transaction fee' },
    { id: generateId(), description: 'SendGrid Email', rate: 90, quantity: 1, costType: 'monthly', rateBasis: 'monthly', plannedHours: 0, notes: 'Transactional & marketing emails' },
  ];
  const llm: CostItem[] = [
    { id: generateId(), description: 'OpenAI GPT-4 API', rate: 600, quantity: 1, costType: 'monthly', rateBasis: 'monthly', plannedHours: 0, notes: 'AI inference costs' },
    { id: generateId(), description: 'Pinecone Vector DB', rate: 70, quantity: 1, costType: 'monthly', rateBasis: 'monthly', plannedHours: 0, notes: 'Embedding storage' },
  ];
  const overhead: CostItem[] = [
    { id: generateId(), description: 'Office Space', rate: 2500, quantity: 1, costType: 'monthly', rateBasis: 'monthly', plannedHours: 0, notes: 'Coworking space rental' },
    { id: generateId(), description: 'Legal & Compliance', rate: 5000, quantity: 1, costType: 'onetime', rateBasis: 'monthly', plannedHours: 0, notes: 'Initial legal setup' },
  ];
  return { labour, infra, apis, llm, overhead };
}

function makeDefaultActualHours(costItems: Record<string, CostItem[]>): Record<string, Record<number, number>> {
  const ah: Record<string, Record<number, number>> = {};
  for (const item of costItems['labour'] ?? []) {
    ah[item.id] = {};
    for (let m = 1; m <= 3; m++) {
      if (item.description === 'Senior Developer') {
        ah[item.id][m] = m === 2 ? 175 : 155;
      } else if (item.description === 'UI/UX Designer') {
        ah[item.id][m] = 160;
      } else {
        ah[item.id][m] = m === 1 ? 150 : 165;
      }
    }
  }
  return ah;
}

const defaultCostItems = makeDefaultCostItems();
const defaultActualHours = makeDefaultActualHours(defaultCostItems);

interface TCTPStore {
  project: ProjectSettings;
  costItems: Record<string, CostItem[]>;
  actualHours: Record<string, Record<number, number>>;
  activePage: PageKey;
  isAuthenticated: boolean;
  sidebarOpen: boolean;

  getComputed: () => AllComputed;

  setProjectField: <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => void;
  setActivePage: (page: PageKey) => void;
  login: () => void;
  logout: () => void;
  toggleSidebar: () => void;
  addCostItem: (category: Category) => void;
  updateCostItem: (category: Category, id: string, updates: Partial<CostItem>) => void;
  deleteCostItem: (category: Category, id: string) => void;
  setActualHours: (resourceId: string, month: number, hours: number) => void;
}

export const useTCTPStore = create<TCTPStore>((set, get) => ({
  project: defaultProject,
  costItems: defaultCostItems,
  actualHours: defaultActualHours,
  activePage: 'dashboard',
  isAuthenticated: false,
  sidebarOpen: false,

  getComputed: () => {
    const s = get();
    return computeAll(s.costItems, s.actualHours, s.project);
  },

  setProjectField: (key, value) =>
    set((s) => {
      const project = { ...s.project, [key]: value };
      project.duration = Math.max(1, Math.round(Number(project.duration) || 1));
      project.currentMonth = Math.min(
        project.duration,
        Math.max(0, Math.round(Number(project.currentMonth) || 0))
      );
      project.salesPeriod = Math.max(1, Math.round(Number(project.salesPeriod) || 1));
      project.targetVolume = Math.max(1, Number(project.targetVolume) || 1);
      project.standardHours = Math.max(1, Number(project.standardHours) || 1);
      project.sellingPriceOverride = Math.max(0, Number(project.sellingPriceOverride) || 0);
      return { project };
    }),

  setActivePage: (page) => set({ activePage: page, sidebarOpen: false }),

  login: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false, activePage: 'dashboard' }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  addCostItem: (category) =>
    set((s) => ({
      costItems: {
        ...s.costItems,
        [category]: [
          ...(s.costItems[category] ?? []),
          {
            id: generateId(),
            description: 'New Item',
            rate: 0,
            quantity: 1,
            costType: 'monthly' as const,
            rateBasis: 'monthly' as const,
            plannedHours: 160,
            notes: '',
          },
        ],
      },
    })),

  updateCostItem: (category, id, updates) =>
    set((s) => ({
      costItems: {
        ...s.costItems,
        [category]: (s.costItems[category] ?? []).map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      },
    })),

  deleteCostItem: (category, id) =>
    set((s) => ({
      costItems: {
        ...s.costItems,
        [category]: (s.costItems[category] ?? []).filter((item) => item.id !== id),
      },
    })),

  setActualHours: (resourceId, month, hours) =>
    set((s) => ({
      actualHours: {
        ...s.actualHours,
        [resourceId]: {
          ...(s.actualHours[resourceId] ?? {}),
          [month]: hours,
        },
      },
    })),
}));
