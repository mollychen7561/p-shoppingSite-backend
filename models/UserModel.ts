import mongoose, { Schema, model, Document } from "mongoose";

export interface ICartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface IShippingInfo {
  phoneNumber: string;
  address: string;
  paymentMethod: string;
}

export interface BaseOrder {
  items: IOrderItem[];
  total: number;
  createdAt: Date;
  shippingInfo: IShippingInfo;
}

export interface IOrder extends Document, BaseOrder {
  _id: mongoose.Types.ObjectId;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  favorites: string[];
  cart: ICartItem[];
  orders: IOrder[];
}

const cartItemSchema = new Schema<ICartItem>({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, required: true }
});

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, required: true }
});

const shippingInfoSchema = new Schema<IShippingInfo>({
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^\d{10}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid phone number!`
    }
  },
  address: {
    type: String,
    required: true,
    maxlength: [30, "Address cannot be more than 30 characters long"]
  },
  paymentMethod: { type: String, required: true }
});

const orderSchema = new Schema<IOrder>({
  items: [orderItemSchema],
  total: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
  shippingInfo: { type: shippingInfoSchema, required: true }
});

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  favorites: [{ type: String }],
  cart: [cartItemSchema],
  orders: [orderSchema]
});

const User = model<IUser>("User", userSchema);

export default User;
