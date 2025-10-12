export enum IssueStatus {
  NEW = 'new',
  IN_PROGRESS = 'inProgress',
  CLOSED = 'closed'
};

//TODO: привести к общему 
export enum IssueUserType {
  CUSTOMER = 'Customer',
  SELLER = 'Seller'
};

export enum IssueLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum IssueStatusFilter {
  NEW = 'new',
  IN_PROGRESS = 'inProgress',
  CLOSED = 'closed',
  ALL = 'all',
  ACTIVE = 'active'
}