export class GetEmployeesQuery {
  constructor(
    public readonly sellerId?: string,
    public readonly shopId?: string,
  ) {}
}

export class GetEmployeeQuery {
  constructor(
    public readonly employeeId?: string,
    public readonly phoneNumber?: string,
  ) {}
}
  