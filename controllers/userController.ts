import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, {
  IUser,
  IOrder,
  ICartItem,
  IOrderItem,
  IShippingInfo,
  BaseOrder
} from "../models/UserModel";
import dotenv from "dotenv";
dotenv.config();

// Helper function to handle errors
const handleError = (res: Response, error: unknown) => {
  console.error("Error:", error);
  res.status(500).json({
    message: "Server error",
    error: error instanceof Error ? error.message : String(error)
  });
};

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res
        .status(400)
        .json({ message: "Name, email, and password are required" });
      return;
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      res.status(400).json({ message: "Email already in use" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    handleError(res, error);
  }
};

// User login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract email and password from request body
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Search for user in database
    const user = await User.findOne({ email }).exec();

    // If user not found, return error
    if (!user) {
      res.status(400).json({ message: "Invalid email or password" });
      return;
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid email or password" });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
      expiresIn: "4h"
    });

    // Send successful login response
    res.status(200).json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    // Handle any errors
    console.error("Login error:", error);
    handleError(res, error);
  }
};

// Get user profile
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    handleError(res, error);
  }
};

// Add product to favorites
export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { productId } = req.body;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!productId) {
      res.status(400).json({ message: "Product ID is required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.favorites.includes(productId)) {
      res.status(200).json({
        message: "Product already in favorites",
        favorites: user.favorites
      });
      return;
    }

    user.favorites.push(productId);
    await user.save();

    res.status(200).json({
      message: "Product added to favorites",
      favorites: user.favorites
    });
  } catch (error) {
    next(error);
  }
};

// Remove product from favorites
export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { productId } = req.body;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!productId) {
      res.status(400).json({ message: "Product ID is required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const index = user.favorites.indexOf(productId);
    if (index === -1) {
      res.status(400).json({ message: "Product not in favorites" });
      return;
    }

    user.favorites.splice(index, 1);
    await user.save();

    res.status(200).json({
      message: "Product removed from favorites",
      favorites: user.favorites
    });
  } catch (error) {
    if (!res.headersSent) {
      handleError(res, error);
    } else {
      next(error);
    }
  }
};

// Get user's favorite products
export const getFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId).select("favorites");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    handleError(res, error);
  }
};

// Get user's cart
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const validCartItems = user.cart.filter(
      (item) => item.productId && item.quantity > 0
    );

    if (validCartItems.length !== user.cart.length) {
      user.cart = validCartItems;
      await user.save();
    }

    res.json({ cart: validCartItems });
  } catch (error) {
    handleError(res, error);
  }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { productId, quantity, name, price, image } = req.body.item;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const existingItemIndex = user.cart.findIndex(
      (item) => item.productId === productId
    );
    if (existingItemIndex > -1) {
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      user.cart.push({ productId, quantity, name, price, image });
    }

    await user.save();
    res.status(200).json({ message: "Cart updated", cart: user.cart });
  } catch (error) {
    handleError(res, error);
  }
};

// Update entire cart
export const updateCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { cart } = req.body;

    const user = await User.findByIdAndUpdate(userId, { cart }, { new: true });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ message: "Cart updated", cart: user.cart });
  } catch (error) {
    handleError(res, error);
  }
};

// Remove item from cart
export const removeFromCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const productId = req.params.productId;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    user.cart = user.cart.filter((item) => item.productId !== productId);
    await user.save();

    res.json({ message: "Item removed from cart", cart: user.cart });
  } catch (error) {
    handleError(res, error);
  }
};

// Update quantity of specific item in cart
export const updateCartItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const productId = req.params.productId;
    const { quantity } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const itemIndex = user.cart.findIndex(
      (item) => item.productId === productId
    );
    if (itemIndex > -1) {
      user.cart[itemIndex].quantity = quantity;
      await user.save();
      res.json({ message: "Cart item updated", cart: user.cart });
    } else {
      res.status(404).json({ message: "Item not found in cart" });
    }
  } catch (error) {
    handleError(res, error);
  }
};

// Clear cart
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const user = await User.findByIdAndUpdate(
      userId,
      { cart: [] },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ message: "Cart cleared", cart: user.cart });
  } catch (error) {
    handleError(res, error);
  }
};

// Merge local and server cart
export const mergeCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { cart: localCart } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const mergedCart = [...user.cart];
    localCart.forEach((localItem: ICartItem) => {
      const existingItemIndex = mergedCart.findIndex(
        (item) => item.productId === localItem.productId
      );
      if (existingItemIndex > -1) {
        mergedCart[existingItemIndex].quantity += localItem.quantity;
      } else {
        mergedCart.push(localItem);
      }
    });

    user.cart = mergedCart;
    await user.save();

    res.json({ message: "Carts merged", cart: user.cart });
  } catch (error) {
    handleError(res, error);
  }
};

// Create a new order
export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { items, total, shippingInfo } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const newOrder: IOrder = {
      _id: new mongoose.Types.ObjectId(),
      items,
      total,
      shippingInfo,
      createdAt: new Date()
    } as IOrder;

    user.orders.push(newOrder);
    await user.save();

    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    handleError(res, error);
  }
};

// Get user's orders
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId).select("orders");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const orders = user.orders.map((order) => ({
      _id: order._id,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      total: order.total,
      createdAt: order.createdAt,
      shippingInfo: order.shippingInfo
    }));

    res.status(200).json(orders);
  } catch (error) {
    handleError(res, error);
  }
};
