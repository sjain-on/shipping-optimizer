import { z } from 'zod';

export const CreateConsolidationSchema = z.object({
  orderIds: z.array(z.string().uuid()),
  customerId: z.string(),
  shippingAddressHash: z.string(),
});

export const ApproveConsolidationSchema = z.object({
  consolidationId: z.string().uuid(),
});

export const CreateShipmentSchema = z.object({
  consolidationId: z.string().uuid(),
});

export const SyncAWBSchema = z.object({
  shipmentId: z.string().uuid(),
  awb: z.string(),
});