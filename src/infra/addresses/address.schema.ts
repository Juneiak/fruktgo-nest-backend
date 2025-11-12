import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, PaginateModel, Types } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { AddressEntityType } from './addresses.enums';

@Schema({
  timestamps: true,
  versionKey: false,
  id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Address {
  _id: Types.ObjectId;
  addressId: string;
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: String, required: true, enum: Object.values(AddressEntityType) })
  entityType: AddressEntityType;

  @Prop({ 
    type: Types.ObjectId, 
    required: true,
    refPath: 'entityType' // Динамическая ссылка на разные модели
  })
  entity: Types.ObjectId;

  @Prop({ type: Number, required: true })
  latitude: number;

  @Prop({ type: Number, required: true })
  longitude: number;

  @Prop({ type: String, required: true })
  city: string;

  @Prop({ type: String, required: true })
  street: string;

  @Prop({ type: String, required: true })
  house: string;

  @Prop({ type: String })
  apartment?: string;

  @Prop({ type: String })
  floor?: string;

  @Prop({ type: String })
  entrance?: string;

  @Prop({ type: String })
  intercomCode?: string;

  @Prop({ type: String })
  label?: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
AddressSchema.plugin(mongoosePaginate);
AddressSchema.plugin(mongooseLeanVirtuals);

// Виртуальные поля
AddressSchema.virtual('addressId').get(function() {
  return this._id?.toString() || '';
});


export type AddressModel = PaginateModel<Address>;
export type AddressDocument = HydratedDocument<Address>;
