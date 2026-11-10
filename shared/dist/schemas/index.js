"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncAWBSchema = exports.CreateShipmentSchema = exports.ApproveConsolidationSchema = exports.CreateConsolidationSchema = void 0;
const zod_1 = require("zod");
exports.CreateConsolidationSchema = zod_1.z.object({
    orderIds: zod_1.z.array(zod_1.z.string().uuid()),
    customerId: zod_1.z.string(),
    shippingAddressHash: zod_1.z.string(),
});
exports.ApproveConsolidationSchema = zod_1.z.object({
    consolidationId: zod_1.z.string().uuid(),
});
exports.CreateShipmentSchema = zod_1.z.object({
    consolidationId: zod_1.z.string().uuid(),
});
exports.SyncAWBSchema = zod_1.z.object({
    shipmentId: zod_1.z.string().uuid(),
    awb: zod_1.z.string(),
});
//# sourceMappingURL=index.js.map