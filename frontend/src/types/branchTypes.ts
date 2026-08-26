export type BranchStatus = 'Active' | 'Inactive';

export interface Branch {
    id: string; // e.g., 'CK-0101'
    name: string;
    address: string;
    district: string;
    phone: string;
    managerName: string;
    staffCount: number;
    status: BranchStatus;
    openedAt: string; // YYYY-MM-DD
}

export type BranchFormValues = Omit<Branch, 'id'>;
