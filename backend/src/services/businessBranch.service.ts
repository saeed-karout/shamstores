import prisma from './prisma';

export type BusinessType = 'restaurant' | 'store';

export interface BranchSummary {
  id: string;
  name: string;
  slug: string;
  subdomain?: string | null;
  customDomain?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  plan?: {
    id: string;
    name: string;
    price: number;
  } | null;
  linkLabel: string;
  linkType: 'custom_domain' | 'subdomain' | 'slug';
}

const getBranchLinkLabel = (branch: { slug: string; subdomain?: string | null; customDomain?: string | null }): string => {
  if (branch.customDomain) return branch.customDomain;
  if (branch.subdomain) return `${branch.subdomain}.shamstores.com`;
  return branch.slug;
};

const getBranchLinkType = (branch: { subdomain?: string | null; customDomain?: string | null }): BranchSummary['linkType'] => {
  if (branch.customDomain) return 'custom_domain';
  if (branch.subdomain) return 'subdomain';
  return 'slug';
};

export const buildBranchSummary = <T extends { slug: string; subdomain?: string | null; customDomain?: string | null }>(branch: T): Pick<BranchSummary, 'linkLabel' | 'linkType'> => ({
  linkLabel: getBranchLinkLabel(branch),
  linkType: getBranchLinkType(branch),
});

export const getLinkedBranches = async (
  businessType: BusinessType,
  ownerUserId?: string | null,
  currentBusinessId?: string | null
): Promise<BranchSummary[]> => {
  if (!ownerUserId) return [];

  const select = {
    id: true,
    name: true,
    slug: true,
    subdomain: true,
    customDomain: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    plan: {
      select: {
        id: true,
        name: true,
        price: true,
      }
    }
  } as const;

  const where: any = { userId: ownerUserId };
  if (currentBusinessId) {
    where.id = { not: currentBusinessId };
  }

  const businesses = businessType === 'restaurant'
    ? await prisma.restaurant.findMany({ where, select })
    : await prisma.store.findMany({ where, select });

  return businesses.map((branch: any) => ({
    ...branch,
    linkLabel: getBranchLinkLabel(branch),
    linkType: getBranchLinkType(branch),
  }));
};
