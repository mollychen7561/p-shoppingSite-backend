import { Router } from "express";
import {
  register,
  login,
  getUser,
  addFavorite,
  removeFavorite,
  getFavorites,
  getCart,
  addToCart,
  updateCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  mergeCart,
  createOrder,
  getOrders
} from "../controllers/userController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// The following routes require authentication
router.get("/profile", authMiddleware, getUser);

router.get("/cart", authMiddleware, getCart);
router.post("/cart", authMiddleware, addToCart);
router.put("/cart", authMiddleware, updateCart);
router.delete("/cart/:productId", authMiddleware, removeFromCart);
router.put("/cart/:productId", authMiddleware, updateCartItem);
router.delete("/cart", authMiddleware, clearCart);
router.post("/merge-cart", authMiddleware, mergeCart);

router.post("/favorites/add", authMiddleware, addFavorite);
router.post("/favorites/remove", authMiddleware, removeFavorite);
router.get("/favorites", authMiddleware, getFavorites);

router.post("/orders", authMiddleware, createOrder);
router.get("/orders", authMiddleware, getOrders);

export default router;
