// app/admin/diensten/types/service.ts
export type Service = {
  idx: number;
  id: string;
  name: string;
  category: string;
  price: string;
  promo_price: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  active: boolean;
  display_order: number;
  category_order: number;
  created_at: string;
  description: string;
};