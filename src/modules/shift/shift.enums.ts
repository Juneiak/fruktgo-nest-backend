export enum ShiftStatus {
  OPEN = 'open',
  PAUSED = 'paused',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ABANDONED = 'abandoned',
}

export enum ShiftEventType {
  OPEN = 'open',
  PAUSE = 'pause',
  RESUME = 'resume',
  START_CLOSING = 'start_closing',
  CLOSE = 'close',
  FORCE_CLOSE = 'force_close',
  ABANDON = 'abandon',
}

export enum ActorType {
  EMPLOYEE = 'Employee',
  SELLER = 'Seller',
  ADMIN = 'Admin',
}