@Module({
  imports: [
    SellersModule,  // экспортируют фасады
    ShopsModule,
    ShiftsModule,
  ],
  providers: [OpenShiftOrchestrator],
  exports: [OpenShiftOrchestrator],
})
export class ProcessesModule {}