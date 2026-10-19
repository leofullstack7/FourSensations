import type { FulfillmentStageId } from "@/lib/fulfillment-kanban";

export type AdminFulfillmentOrderItem = {
  productId: string | null;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type AdminFulfillmentOrder = {
  id: string;
  reference: string;
  paymentProvider: string | null;
  paymentStatus: string;
  status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  couponCode: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerNote: string | null;
  shippingAddress: Record<string, unknown> | null;
  fulfillmentStage: FulfillmentStageId;
  fulfillmentStageAt: string;
  createdAt: string;
  updatedAt: string;
  items: AdminFulfillmentOrderItem[];
};
