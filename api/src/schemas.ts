import { z } from 'zod';

export const CreateConsolidationSchema = z.object({
  orderIds: z.array(z.string()),
  customerId: z.string(),
  shippingAddressHash: z.string(),
});

export const ApproveConsolidationSchema = z.object({
  consolidationId: z.string(),
});

export const CreateShipmentSchema = z.object({
  consolidationId: z.string(),
});

export const SyncAWBSchema = z.object({
  awb: z.string(),
});
