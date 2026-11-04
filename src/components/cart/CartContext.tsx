"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  skuId: string;
  productName: string;
  variantName: string;
  mrpPaise: number;
  guaranteedPricePaise: number;
  quantity: number;
  imageUrl?: string;
  categoryName?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (skuId: string, quantity: number) => void;
  removeItem: (skuId: string) => void;
  clearCart: () => void;
  loadItems: (items: CartItem[]) => void;
  totalItemsCount: number;
  totalGuaranteedPaise: number;
  totalMrpPaise: number;
  totalSavingsPaise: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sb_cart_items");
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to read cart from localStorage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage when items change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem("sb_cart_items", JSON.stringify(items));
      } catch (e) {
        console.warn("Failed to save cart to localStorage", e);
      }
    }
  }, [items, isLoaded]);

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.skuId === item.skuId);
      if (existing) {
        return prev.map((i) =>
          i.skuId === item.skuId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const updateQuantity = (skuId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(skuId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.skuId === skuId ? { ...i, quantity } : i))
    );
  };

  const removeItem = (skuId: string) => {
    setItems((prev) => prev.filter((i) => i.skuId !== skuId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const loadItems = (newItems: CartItem[]) => {
    setItems(newItems);
  };

  const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalGuaranteedPaise = items.reduce(
    (sum, i) => sum + i.guaranteedPricePaise * i.quantity,
    0
  );
  const totalMrpPaise = items.reduce((sum, i) => sum + i.mrpPaise * i.quantity, 0);
  const totalSavingsPaise = Math.max(0, totalMrpPaise - totalGuaranteedPaise);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        loadItems,
        totalItemsCount,
        totalGuaranteedPaise,
        totalMrpPaise,
        totalSavingsPaise,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
