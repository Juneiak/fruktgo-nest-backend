  async repinEmployeeToShop(authedSeller: AuthenticatedUser, employeeId: string): Promise<EmployeeResponseDto> {
    if (dto.pinnedTo !== undefined) {
      if (dto.pinnedTo === null || dto.pinnedTo === '') {
        employee.pinnedTo = null;
        employee.status = EmployeeStatus.NOT_PINNED;
        changes.push('Откреплён от магазина');
      } else {
        checkId([dto.pinnedTo]);
        const foundShop = await this.shopModel
        .findOne({
          _id: new Types.ObjectId(dto.pinnedTo),
          owner: new Types.ObjectId(authedSeller.id)
        })
        .exec();

        if (!foundShop) throw new NotFoundException('Магазин не найден или он не принадлежит вам');
        employee.pinnedTo = new Types.ObjectId(dto.pinnedTo);
        employee.status = EmployeeStatus.RESTING;
        changes.push(`Закреплён за магазином ${foundShop._id.toString()}`);
      }
    }
  };



  async repinEmployeeFromSeller(employeeId: string): Promise<EmployeeResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findOne({ _id: new Types.ObjectId(employeeId), employer: new Types.ObjectId(authedSeller.id) }).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (employee.openedShift) throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');

    const oldShopId = employee.pinnedTo?.toString() || null;

    employee.employer = null;
    employee.pinnedTo = null;
    employee.status = EmployeeStatus.NOT_PINNED;
    employee.sellerNote = null;
    employee.position = null;
    employee.salary = null;

    if (employee.isModified()) {
      await employee.save();
    }
    return this.getEmployee(authedSeller, employee._id.toString());
  };


  